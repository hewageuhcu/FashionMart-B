const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { verifySession, isInventoryManager, isAdminOrInventoryManager } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Apply middleware to all routes
router.use(verifySession);

// Apply specific middleware for certain routes
router.use('/designs', isInventoryManager);
router.use('/products', isAdminOrInventoryManager);
router.use('/stock', isAdminOrInventoryManager);
router.use('/categories', isAdminOrInventoryManager);

// Product management
router.get('/products', inventoryController.getAllProducts);
router.get('/products/:productId', inventoryController.getProductById);
router.post('/products', upload.array('productImages', 5), inventoryController.createProduct);
router.put('/products/:productId', upload.array('productImages', 5), inventoryController.updateProduct);

// Stock management
router.put('/stock/:stockId', inventoryController.updateStock);
router.get('/stock/low', inventoryController.getLowStockProducts);

// Design review
router.get('/designs/pending', inventoryController.getPendingDesigns);
router.post('/designs/:designId/review', inventoryController.reviewDesign);

// Category management
router.get('/categories', inventoryController.getAllCategories);
router.post('/categories', upload.single('categoryImage'), inventoryController.createCategory);
router.put('/categories/:categoryId', upload.single('categoryImage'), inventoryController.updateCategory);

module.exports = router;