const express = require('express');
const router = express.Router();
const { analyzeSpending } = require('../controllers/aiController');

router.get('/analyze', analyzeSpending);

module.exports = router;