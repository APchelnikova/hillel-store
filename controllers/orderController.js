const { sequelize } = require('../config/db');
const Order = require('../models/orderModel');
const OrderItem = require('../models/orderItemModel');
const Product = require('../models/productModel');

// Load the order's items together with the order (Sequelize's version of populate())
const WITH_ITEMS = { include: [{ model: OrderItem, as: 'items' }] };

// An error that carries an HTTP status, so we can throw it inside a transaction
const httpError = (status, message) => Object.assign(new Error(message), { status });

const createOrder = async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
    }

    if (items.some(({ quantity }) => !Number.isInteger(quantity) || quantity <= 0)) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
    }

    try {
        // A transaction makes all the queries inside it succeed or fail together.
        // If anything throws, every stock change is rolled back automatically,
        // so we no longer need to give the stock back by hand.
        const order = await sequelize.transaction(async (transaction) => {
            const orderItems = [];
            let total = 0;

            for (const { productId, quantity } of items) {
                // LOCK.UPDATE (SELECT ... FOR UPDATE) stops other orders from changing
                // this product's stock until our transaction is finished.
                const product = await Product.findByPk(productId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (!product) {
                    throw httpError(400, `Product not found: ${productId}`);
                }

                if (product.stock < quantity) {
                    throw httpError(400, `Insufficient stock for "${product.name}"`);
                }

                product.stock -= quantity;
                await product.save({ transaction });

                orderItems.push({
                    productId: product.id,
                    quantity,
                    priceAtPurchase: product.price,
                });
                total += product.price * quantity;
            }

            // Creates the order and all its OrderItems rows in one call
            return Order.create(
                {
                    userId: req.user.id,
                    items: orderItems,
                    total: Math.round(total * 100) / 100,
                },
                { ...WITH_ITEMS, transaction }
            );
        });

        return res.status(201).json(order);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ message: error.message });
        }
        throw error;
    }
};

const getOrders = async (req, res) => {
    const where = req.user.role === "admin" ? {} : { userId: req.user.id };
    const orders = await Order.findAll({ where, ...WITH_ITEMS });
    return res.json(orders);
};

const getOrderById = async (req, res) => {
    const order = await Order.findByPk(req.params.id, WITH_ITEMS);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role !== "admin" && order.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
    }

    return res.json(order);
};

const updateOrderStatus = async (req, res) => {
    const { status } = req.body;

    const order = await Order.findByPk(req.params.id, WITH_ITEMS);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    return res.json(order);
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
