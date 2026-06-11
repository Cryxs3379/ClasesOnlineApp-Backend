const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

router.get('/db', healthController.checkDatabase);

module.exports = router;
