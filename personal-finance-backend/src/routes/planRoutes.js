const express = require('express');
const router = express.Router();
const { getSavings, addSaving, updateSaving, getDebts, addDebt, updateDebt } = require('../controllers/planController');

// Routes cho Tiết kiệm
router.get('/savings', getSavings);
router.post('/savings', addSaving);
router.put('/savings/:id', updateSaving);

// Routes cho Nợ
router.get('/debts', getDebts);
router.post('/debts', addDebt);
router.put('/debts/:id', updateDebt);

module.exports = router;