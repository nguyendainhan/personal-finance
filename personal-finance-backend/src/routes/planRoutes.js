const express = require('express');
const router = express.Router();
const {
    getSavings,
    addSaving,
    updateSaving,
    deleteSaving,
    getDebts,
    addDebt,
    updateDebt,
    deleteDebt
} = require('../controllers/planController');

// Routes cho Tiết kiệm
router.get('/savings', getSavings);
router.post('/savings', addSaving);
router.put('/savings/:id', updateSaving);
router.delete('/savings/:id', deleteSaving);

// Routes cho Nợ
router.get('/debts', getDebts);
router.post('/debts', addDebt);
router.put('/debts/:id', updateDebt);
router.delete('/debts/:id', deleteDebt);

module.exports = router;
