const express = require('express');
const router = express.Router();
const { getWallets, addWallet, updateWallet, deleteWallet } = require('../controllers/walletController');

router.get('/', getWallets);
router.post('/', addWallet);
router.put('/:id', updateWallet);
router.delete('/:id', deleteWallet);

module.exports = router;