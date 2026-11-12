const express = require('express');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
    getProducts,
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductAttributes,
    addProductAttribute
} = require('../controllers/productController');

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authMiddleware, createProduct);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);

// Product attributes (rows of product_attributes): anyone can view, only the owner can add
router.get('/:id/attributes', getProductAttributes);
router.post('/:id/attributes', authMiddleware, addProductAttribute);

module.exports = router;
