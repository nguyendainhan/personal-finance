const express = require('express');
const router = express.Router();
const { getWallets } = require('../controllers/walletController');

// Endpoint: GET /api/wallets/
router.get('/', getWallets);

module.exports = router;