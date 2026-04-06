const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ThemeController = require('../controllers/ThemeController');
const { authMiddleware, restrictRole } = require('../middleware/authMiddleware');

// Ensure upload directories exist
const uploadDir = 'uploads/themes';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer Storage setup for file uploads.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 } // Approx 2MB per file
});

/**
 * Routes setup:
 * 1. GET /categories: List standard system categories.
 * 2. GET /: List available/public themes.
 * 3. POST /: Register a new theme with up to 6 symbols.
 * 4. DELETE /: Remove a specific theme.
 */
router.get('/categories', ThemeController.getCategories);
router.post('/categories', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  upload.array('symbols', 6), 
  ThemeController.createCategory
);
router.delete('/categories/:id', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  ThemeController.deleteCategory
);

router.post('/categories/subs', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  ThemeController.createSubCategory
);
router.delete('/categories/subs/:id', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  ThemeController.deleteSubCategory
);

router.get('/', ThemeController.listThemes);
router.post('/', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  upload.array('symbols', 6), 
  ThemeController.createTheme
);
router.delete('/:id', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  ThemeController.deleteTheme
);

module.exports = router;
