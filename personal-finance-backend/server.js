require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

const { verifyToken } = require('./src/middleware/authMiddleware.js');

// Middleware chung
app.use(cors());
app.use(express.json()); // Để parse JSON body từ Frontend

app.use('/api/auth', require('./src/routes/authRoutes'));

app.use('/api/wallets', verifyToken, require('./src/routes/walletRoutes'));
app.use('/api/transactions', verifyToken, require('./src/routes/transactionRoutes'));
app.use('/api/categories', verifyToken, require('./src/routes/categoryRoutes'));
app.use('/api/budgets', verifyToken, require('./src/routes/budgetRoutes'));
app.use('/api/ai', verifyToken, require('./src/routes/aiRoutes'));
app.use('/api/plans', verifyToken, require('./src/routes/planRoutes'));

// Test DB Connection
const pool = require('./src/config/database');
pool.query('SELECT 1 + 1 AS solution')
    .then(() => console.log('✅ Connected to MySQL Database'))
    .catch(err => console.error('❌ Database connection error:', err));

// Route cơ bản
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to IceStore Finance API', version: '2.2.0' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
