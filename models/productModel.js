const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const User = require("./userModel");

const CATEGORIES = ["electronics", "books", "clothing", "food"];

// sequelize.define(name, columns, options) tells Sequelize to manage the table
// "products" (set with tableName below) with the columns below.
const Product = sequelize.define("Product", {
    id: {
        type: DataTypes.UUID,           // char(36) in the table
        defaultValue: DataTypes.UUIDV4, // Sequelize generates a random id for new rows
        primaryKey: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false                // same as Mongoose's "required: true"
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
        type: DataTypes.INTEGER,        // whole numbers only
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT            // optional, can be empty
    },
    ownerId: {
        // The user (admin) who created the product. Column "owner_id" in the table.
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "users", key: "id" }
    }
}, {
    tableName: "products",
    timestamps: true,                   // same as Mongoose's "timestamps: true"
    underscored: true                   // ownerId -> owner_id, createdAt -> created_at
});

// One user owns many products; each product belongs to one user.
User.hasMany(Product, { foreignKey: "ownerId" });
Product.belongsTo(User, { foreignKey: "ownerId", as: "owner" });

module.exports = Product;
