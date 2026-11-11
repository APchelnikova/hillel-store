const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// In Mongoose, order items were an array of sub-documents inside each order.
// SQL tables can't store arrays, so each item is its own row in the
// "order_items" table and points to its order with "order_id".
const OrderItem = sequelize.define("OrderItem", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" }   // foreign key -> orders.id
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "products", key: "id" } // same as Mongoose's "ref: 'Products'"
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false            // same as Mongoose's "required: true"
    },
    priceAtPurchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        // MySQL returns DECIMAL as a string, convert it back to a number
        get() {
            const value = this.getDataValue("priceAtPurchase");
            return value === null ? null : Number(value);
        }
    }
}, {
    tableName: "order_items",
    timestamps: true,               // the table has created_at / updated_at
    underscored: true               // orderId -> order_id, priceAtPurchase -> price_at_purchase, ...
});

module.exports = OrderItem;
