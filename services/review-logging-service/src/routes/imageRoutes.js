const express = require('express');
const router = express.Router();
const { getImages, getPrimaryImage } = require('../controllers/imageController');

router.get('/', getImages);
router.get('/primary', getPrimaryImage);

module.exports = router;

