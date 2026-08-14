const Order = require('../models/orderModel');
const Product = require('../models/productModel');

const releaseStock = async (reserved) => {
    for (const { productId, quantity } of reserved) {
        await Product.findByIdAndUpdate(productId, { $inc: { stock: quantity } });
    }
};

const createOrder = async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Items are required" });
    }

    const orderItems = [];
    const reserved = [];
    let total = 0;

    for (const { productId, quantity } of items) {
        if (!Number.isInteger(quantity) || quantity <= 0) {
            await releaseStock(reserved);
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        // Atomic check and decrement
        const product = await Product.findOneAndUpdate(
            { _id: productId, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true }
        );

        if (!product) {
            await releaseStock(reserved);

            const existing = await Product.findById(productId);
            if (!existing) {
                return res.status(400).json({ message: `Product not found: ${productId}` });
            }
            return res.status(400).json({ message: `Insufficient stock for "${existing.name}"` });
        }

        reserved.push({ productId, quantity });
        orderItems.push({
            product: product._id,
            quantity,
            priceAtPurchase: product.price,
        });
        total += product.price * quantity;
    }

    const order = await Order.create({
        user: req.user.id,
        items: orderItems,
        total,
    });

    return res.status(201).json(order);
};

const getOrders = async (req, res) => {
    const filter = req.user.role === "admin" ? {} : { user: req.user.id };
    const orders = await Order.find(filter);
    return res.json(orders);
};

const getOrderById = async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role !== "admin" && order.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
    }

    return res.json(order);
};

const updateOrderStatus = async (req, res) => {
    const { status } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    return res.json(order);
};

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus };
