const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

// In Mongoose, order items were an array of sub-documents inside each order.
// SQL tables can't store arrays, so each item becomes its own row in the
// "OrderItems" table and points to its order with "orderId".
const OrderItem = sequelize.define("OrderItem", {
    orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Orders", key: "id" }   // foreign key -> Orders.id
    },
    productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Products", key: "id" } // same as Mongoose's "ref: 'Products'"
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
    // The Mongoose sub-schema had no timestamps, so we turn them off here too.
    // ("_id: false" has no equivalent: every SQL row still gets its own "id".)
    timestamps: false
});

module.exports = OrderItem;
