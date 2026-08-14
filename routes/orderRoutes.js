const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');

router.post('/', authMiddleware, createOrder);
router.get('/', authMiddleware, getOrders);
router.get('/:id', authMiddleware, getOrderById);
router.patch('/:id/status', authMiddleware, roleMiddleware("admin"), updateOrderStatus);

module.exports = router;
