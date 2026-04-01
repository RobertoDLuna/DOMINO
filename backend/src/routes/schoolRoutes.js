const express = require('express');
const router = express.Router();
const SchoolController = require('../controllers/SchoolController');

router.get('/', SchoolController.list);

module.exports = router;
