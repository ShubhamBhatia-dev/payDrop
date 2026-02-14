const { ethers } = require('ethers');
const Stream = require('../models/Stream');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const contractABI = require('./contractABI.json');
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

const StreamTypeMap = ['Continuous', 'OneTime'];
const StreamStateMap = ['Active', 'Completed', 'Cancelled', 'Paused'];

let provider;
let contract;

function setupProvider() {
    console.log('Connecting to Blockchain...');
    provider = new ethers.WebSocketProvider(RPC_URL);

    provider.websocket.on('error', (err) => {
        console.error('WebSocket Error:', err);
        reconnect();
    });

    provider.websocket.on('close', (code) => {
        console.warn('WebSocket Closed (code:', code, '). Reconnecting...');
        reconnect();
    });

    contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

    // Re-attach listeners
    contract.on('StreamCreated', handleStreamCreated);
    contract.on('Withdrawn', handleWithdrawn);
    contract.on('StreamStateChanged', handleStreamStateChanged);
    contract.on('Funded', handleFunded);
}

let reconnectTimeout;
function reconnect() {
    if (reconnectTimeout) return;
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        setupProvider();
        syncPastEvents();
    }, 5000);
}

// Helper to get user metadata
async function getWorkerMetadata(address) {
    if (!address) return { name: 'Unknown', email: '' };
    try {
        // Use case-insensitive regex for the wallet address
        const user = await User.findOne({
            walletAddress: { $regex: new RegExp(`^${address}$`, 'i') }
        });

        if (user) {
            return {
                name: user.name,
                email: user.email
            };
        }
        return { name: 'Unknown', email: '' };
    } catch (err) {
        console.error('Error fetching user metadata:', err);
        return { name: 'Unknown', email: '' };
    }
}

async function handleStreamCreated(id, worker, amount, event) {
    const streamId = Number(id);
    // Check if already exists to avoid duplicates from sync
    const exists = await Stream.findOne({ streamId });
    if (exists) return;

    console.log(`New Stream Created: ID ${streamId}`);

    try {
        const info = await contract.getStreamInfo(id);
        const fullStream = await contract.streams(id);
        const metadata = await getWorkerMetadata(worker);

        const newStream = new Stream({
            streamId: streamId,
            workerAddress: worker.toLowerCase(),
            deposit: info.deposit.toString(),
            withdrawn: info.withdrawn.toString(),
            ratePerSecond: info.ratePerSecond.toString(),
            startTime: Number(info.startTime),
            endTime: Number(info.endTime),
            totalPausedDuration: Number(fullStream.totalPausedDuration),
            streamType: StreamTypeMap[Number(info.streamType)],
            state: StreamStateMap[Number(info.state)],
            txHash: event.transactionHash || event.log?.transactionHash || 'synced',
            blockNumber: Number(event.blockNumber || event.log?.blockNumber || 0),
            workerName: metadata.name,
            workerEmail: metadata.email
        });

        await newStream.save();
        console.log(`Stream ${streamId} saved to DB`);
    } catch (err) {
        console.error(`Error handling StreamCreated for ${streamId}:`, err);
    }
}

async function handleWithdrawn(id, worker, amount, event) {
    const streamId = Number(id);
    console.log(`Withdrawal from Stream ${streamId}: ${ethers.formatEther(amount)} ETH`);

    try {
        const info = await contract.getStreamInfo(id);

        await Stream.updateOne(
            { streamId: streamId },
            {
                withdrawn: info.withdrawn.toString(),
                state: StreamStateMap[Number(info.state)]
            }
        );
        console.log(`Stream ${streamId} updated (Withdrawal)`);
    } catch (err) {
        console.error(`Error handling Withdrawn for ${streamId}:`, err);
    }
}

async function handleStreamStateChanged(id, newState, event) {
    const streamId = Number(id);
    const stateStr = StreamStateMap[Number(newState)];
    console.log(`Stream ${streamId} State Changed to ${stateStr}`);

    try {
        const info = await contract.getStreamInfo(id);
        const fullStream = await contract.streams(id);

        await Stream.updateOne(
            { streamId: streamId },
            {
                state: stateStr,
                endTime: Number(info.endTime),
                totalPausedDuration: Number(fullStream.totalPausedDuration)
            }
        );
    } catch (err) {
        console.error(`Error handling StateChange for ${streamId}:`, err);
    }
}

async function handleFunded(sender, amount, event) {
    console.log(`Contract Funded: ${ethers.formatEther(amount)} ETH from ${sender}`);
}

// Sync past events to find missing streams
async function syncPastEvents() {
    console.log('Syncing past events...');
    try {
        // Look back last 5000 blocks (adjust as needed)
        const filter = contract.filters.StreamCreated();
        const events = await contract.queryFilter(filter, -5000);

        console.log(`Found ${events.length} StreamCreated events in recent history`);
        for (const event of events) {
            await handleStreamCreated(event.args[0], event.args[1], event.args[2], event);
        }
    } catch (err) {
        console.error('Error syncing past events:', err);
    }
}

// Verification Sync (Every 10 mins)
async function verifyStreams() {
    console.log('Running periodic stream verification...');
    try {
        // 1. Check existing streams for state/withdraw changes
        const dbStreams = await Stream.find({ state: { $ne: 'Completed' } });

        for (const dbStream of dbStreams) {
            try {
                const info = await contract.getStreamInfo(dbStream.streamId);
                const onChainState = StreamStateMap[Number(info.state)];
                const onChainWithdrawn = info.withdrawn.toString();

                let needsSave = false;
                if (dbStream.state !== onChainState) {
                    dbStream.state = onChainState;
                    needsSave = true;
                }
                if (dbStream.withdrawn !== onChainWithdrawn) {
                    dbStream.withdrawn = onChainWithdrawn;
                    needsSave = true;
                }

                // Metadata sync: If workerName is Unknown, try fetching it again
                if (dbStream.workerName === 'Unknown' || !dbStream.workerName) {
                    const metadata = await getWorkerMetadata(dbStream.workerAddress);
                    if (metadata.name !== 'Unknown') {
                        dbStream.workerName = metadata.name;
                        dbStream.workerEmail = metadata.email;
                        needsSave = true;
                        console.log(`Synced metadata for Stream ${dbStream.streamId}: ${metadata.name}`);
                    }
                }

                if (needsSave) {
                    console.warn(`Discrepancy found or metadata missing for Stream ${dbStream.streamId}. Syncing...`);
                    await dbStream.save();
                }
            } catch (err) {
                console.error(`Error verifying stream ${dbStream.streamId}:`, err.message);
            }
        }

        // 2. Also try to sync past events again just in case
        await syncPastEvents();
    } catch (err) {
        console.error('Verification error:', err);
    }
}

function startEventListener() {
    setupProvider();

    // Initial Sync
    syncPastEvents();
    verifyStreams();

    // Periodic Sync (10 minutes)
    setInterval(verifyStreams, 10 * 60 * 1000);
}

module.exports = { startEventListener };
