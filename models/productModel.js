const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const CATEGORIES = ["electronics", "books", "clothing", "food"];

// sequelize.define(name, columns, options) tells Sequelize to create/manage a table
// called "Products" (pluralized automatically) with the columns below.
const Product = sequelize.define("Product", {
    name: {
        type: DataTypes.STRING,
        allowNull: false            // same as Mongoose's "required: true"
    },
    price: {
        // DECIMAL(10, 2) = up to 10 digits, 2 of them after the dot. Exact, so good for money.
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        // MySQL returns DECIMAL as a string ("19.99"), so convert it back to a number
        // to keep "price * quantity" working like it did with Mongoose's Number.
        get() {
            const value = this.getDataValue("price");
            return value === null ? null : Number(value);
        }
    },
    category: {
        // ENUM column: only these values are allowed in the database.
        type: DataTypes.ENUM(...CATEGORIES),
        allowNull: false,
        // Sequelize doesn't check ENUM values by itself, so "isIn" gives a nice
        // validation error before the query. Together = Mongoose's "enum: [...]".
        validate: { isIn: [CATEGORIES] }
    },
    stock: {
        type: DataTypes.INTEGER,    // whole numbers only
        allowNull: false
    }
}, {
    timestamps: true                // same as Mongoose's "timestamps: true"
});

module.exports = Product;
