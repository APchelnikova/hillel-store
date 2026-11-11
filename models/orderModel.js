const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const User = require("./userModel");
const Product = require("./productModel");
const OrderItem = require("./orderItemModel");

const STATUSES = ["pending", "paid", "shipped", "cancelled"];

// sequelize.define(name, columns, options) tells Sequelize to manage the table
// "orders" (set with tableName below) with the columns below.
const Order = sequelize.define("Order", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,                         // same as Mongoose's "required: true"
        references: { model: "users", key: "id" } // same as Mongoose's "ref: 'User'"
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        // MySQL returns DECIMAL as a string, convert it back to a number
        get() {
            const value = this.getDataValue("total");
            return value === null ? null : Number(value);
        }
    },
    status: {
        type: DataTypes.ENUM(...STATUSES),        // same as Mongoose's "enum"
        allowNull: false,
        defaultValue: "pending",                  // same as Mongoose's "default: 'pending'"
        validate: { isIn: [STATUSES] }            // Sequelize doesn't check ENUM values by itself
    }
}, {
    tableName: "orders",
    timestamps: true,                             // same as Mongoose's "timestamps: true"
    underscored: true                             // userId -> user_id, createdAt -> created_at
});

// Associations describe how tables are linked (Mongoose used "ref" + populate() for this).
// Once they are defined, you can load related rows with "include", e.g.
// Order.findByPk(id, { include: [{ model: OrderItem, as: "items" }] })

// One user has many orders; each order belongs to one user.
// onDelete: "RESTRICT" blocks deleting a user who still has orders
// (otherwise Sequelize defaults to CASCADE and the order history would be wiped).
User.hasMany(Order, { foreignKey: "userId", onDelete: "RESTRICT" });
Order.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "RESTRICT" });

// One order has many items (the old "items" array).
// onDelete: "CASCADE" removes the items when their order is deleted.
Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

// Each item points to one product.
// onDelete: "RESTRICT" blocks deleting a product that is used in an order.
Product.hasMany(OrderItem, { foreignKey: "productId", onDelete: "RESTRICT" });
OrderItem.belongsTo(Product, { foreignKey: "productId", as: "product", onDelete: "RESTRICT" });

module.exports = Order;
