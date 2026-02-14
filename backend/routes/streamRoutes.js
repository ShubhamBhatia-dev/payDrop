const express = require('express');
const router = express.Router();
const Stream = require('../models/Stream');
const User = require('../models/User');

// Get all streams (Admin view)
router.get('/', async (req, res) => {
    try {
        const streams = await Stream.find().sort({ streamId: -1 });
        res.json(streams);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get streams for a specific user
router.get('/user/:address', async (req, res) => {
    try {
        const streams = await Stream.find({ workerAddress: req.params.address.toLowerCase() }).sort({ streamId: -1 });
        res.json(streams);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get single stream details
router.get('/:streamId', async (req, res) => {
    try {
        const stream = await Stream.findOne({ streamId: req.params.streamId });
        if (!stream) {
            return res.status(404).json({ msg: 'Stream not found' });
        }
        res.json(stream);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
