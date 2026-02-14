// Server restart trigger
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./db/db');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/streams', require('./routes/streamRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Import event listener logic
const { startEventListener } = require('./logic/eventListener');

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Start listening to blockchain events after server starts
    startEventListener();
});
