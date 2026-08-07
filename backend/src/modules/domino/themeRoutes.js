const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ThemeController = require('./ThemeController');
const { authMiddleware, restrictRole } = require('../../shared/middleware/authMiddleware');

// Garante que o diretório de uploads exista
const uploadDir = path.resolve(__dirname, '../../../uploads/themes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configuração do Multer para armazenamento de uploads.
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
  limits: { fileSize: 2 * 1024 * 1024 } // Aprox. 2MB por arquivo
});

/**
 * Rotas de Temas e Categorias:
 * 1. GET /categories: Lista categorias/níveis padrão do sistema.
 * 2. GET /: Lista temas públicos ou do usuário logado.
 * 3. POST /: Cria um novo tema com 6 símbolos.
 * 4. DELETE /: Remove um tema específico.
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
router.get('/info/:id', ThemeController.getTheme);
router.delete('/:id', 
  authMiddleware, 
  restrictRole(['PROFESSOR', 'ADMIN']), 
  ThemeController.deleteTheme
);

module.exports = router;
