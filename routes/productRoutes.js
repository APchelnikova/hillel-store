const express = require('express');
const router = express.Router();
const roleMiddleware = require("../middleware/roleMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const { getProducts, createProduct, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authMiddleware, roleMiddleware("admin"), createProduct);
router.put('/:id', authMiddleware, roleMiddleware("admin"), updateProduct);
router.delete('/:id', authMiddleware, roleMiddleware("admin"), deleteProduct);

module.exports = router;
