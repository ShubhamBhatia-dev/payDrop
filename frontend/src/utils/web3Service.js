import { ethers } from 'ethers';
import PayStreamABI from '../abi/PayStream.json';

// REPLACE WITH YOUR DEPLOYED CONTRACT ADDRESS
export const CONTRACT_ADDRESS = '0x8B4B5f425A1922b915761e9Fc14B1C1D8cedFda6';

export const connectWallet = async () => {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed!");
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        return {
            address: accounts[0],
            signer: signer,
            provider: provider
        };
    } catch (error) {
        console.error("Connection error:", error);
        throw new Error("Failed to connect wallet: " + error.message);
    }
};

export const getContract = async (signerOrProvider) => {
    if (!signerOrProvider) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        signerOrProvider = await provider.getSigner();
    }
    return new ethers.Contract(CONTRACT_ADDRESS, PayStreamABI, signerOrProvider);
};

export const createStream = async (workerAddress, amountInEth, streamType, durationOrEndTime) => {
    try {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        // Convert ETH to Wei (18 decimals)
        const amountWei = ethers.parseEther(amountInEth.toString());

        // streamType: 0 = Continuous, 1 = OneTime
        const type = streamType === 'OneTime' ? 1 : 0;

        // durationOrEndTime: seconds (Continuous) or timestamp (OneTime)
        // Ensure accurate BigInt handling
        const duration = BigInt(durationOrEndTime);

        const tx = await contract.createStream(type, workerAddress, amountWei, duration);
        await tx.wait(); // Wait for confirmation
        return tx;
    } catch (error) {
        console.error("Create Stream Error:", error);
        throw error;
    }
};

export const fundSystem = async (amountInEth) => {
    try {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        const amountWei = ethers.parseEther(amountInEth.toString());

        const tx = await contract.fundSystem({ value: amountWei });
        await tx.wait();
        return tx;
    } catch (error) {
        console.error("Fund System Error:", error);
        throw error;
    }
};

export const withdraw = async (streamId) => {
    try {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        const tx = await contract.withdraw(streamId);
        await tx.wait();
        return tx;
    } catch (error) {
        console.error("Withdraw Error:", error);
        throw error;
    }
};

export const setStreamState = async (streamId, newState) => {
    try {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        // newState enum: 0=Active, 1=Completed, 2=Cancelled, 3=Paused
        // Exposed actions usually: Pause (3), Cancel (2), Resume (Active=0)
        let stateEnum;
        switch (newState) {
            case 'Active': stateEnum = 0; break;
            case 'Completed': stateEnum = 1; break;
            case 'Cancelled': stateEnum = 2; break;
            case 'Paused': stateEnum = 3; break;
            default: throw new Error("Invalid state");
        }

        const tx = await contract.setState(streamId, stateEnum);
        await tx.wait();
        return tx;
    } catch (error) {
        console.error("Set State Error:", error);
        throw error;
    }
};

export const emergencyWithdraw = async () => {
    try {
        const { signer } = await connectWallet();
        const contract = await getContract(signer);

        const tx = await contract.emergency();
        await tx.wait();
        return tx;
    } catch (error) {
        console.error("Emergency Withdraw Error:", error);
        throw error;
    }
};

// Listen to events (Optional frontend listener if needed, but backend handles indexing)
// Frontend primarily relies on API for list, but can listen for toaster notifications
export const listenToContractEvents = (callback) => {
    // Basic setup, user can extend
};
