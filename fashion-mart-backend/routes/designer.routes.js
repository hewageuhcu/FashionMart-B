const express = require('express');
const router = express.Router();
const designerController = require('../controllers/designer.controller');
const { verifySession, isDesigner } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

// Apply middleware to all routes
router.use(verifySession, isDesigner);

// Get all designs by designer
router.get('/designs', designerController.getDesignerDesigns);

// Get design by ID
router.get('/designs/:designId', designerController.getDesignById);

// Create new design
router.post('/designs', upload.array('designImages', 5), designerController.createDesign);

// Update design
router.put('/designs/:designId', upload.array('designImages', 5), designerController.updateDesign);

// Delete design
router.delete('/designs/:designId', designerController.deleteDesign);

// Submit design for approval
router.post('/designs/:designId/submit', designerController.submitDesign);

module.exports = router;