const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const Product = require("./productModel");

// Extra "name = value" properties of a product, e.g. color = red, pages = 320.
// Each attribute is its own row in the "product_attributes" table.
const ProductAttribute = sequelize.define("ProductAttribute", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "products", key: "id" } // foreign key -> products.id
    },
    attributeName: {
        type: DataTypes.STRING(100),    // varchar(100) in the table
        allowNull: false,
        validate: { len: [1, 100] }
    },
    attributeValue: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: "product_attributes",
    timestamps: true,
    underscored: true   // productId -> product_id, attributeName -> attribute_name, ...
});

// One product has many attributes.
// Load them with: Product.findByPk(id, { include: [{ model: ProductAttribute, as: "attributes" }] })
Product.hasMany(ProductAttribute, { foreignKey: "productId", as: "attributes", onDelete: "CASCADE" });
ProductAttribute.belongsTo(Product, { foreignKey: "productId" });

module.exports = ProductAttribute;
