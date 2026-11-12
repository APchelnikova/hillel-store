const Product = require('../models/productModel');
const ProductAttribute = require('../models/productAttributeModel');

const productsCache = new Map();
const CACHE_TTL = 30 * 1000;

// Fields a client is allowed to set (so req.body can't overwrite id, createdAt, etc.)
const PRODUCT_FIELDS = ['name', 'price', 'category', 'stock', 'description'];

// Only the user who created the product (products.owner_id) may change it
const isOwner = (product, user) => product.ownerId === user.id;

const clearProductsCache = () => {
    productsCache.clear();
};

const getProducts = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { category } = req.query;

    const where = category ? { category } : {};
    const cacheKey = JSON.stringify({ page, limit, category: category || null });

    const now = Date.now();
    const cached = productsCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
        console.log('Products returned from cache');
        res.locals.fromCache = true; // used by analytics

        return res.json(cached.data);
    }

    // findAndCountAll = find() + countDocuments() in one call.
    // offset/limit are Sequelize's version of skip()/limit().
    const { rows: products, count: total } = await Product.findAndCountAll({
        where,
        offset: (page - 1) * limit,
        limit,
        order: [['createdAt', 'ASC'], ['id', 'ASC']], // stable order, so pages don't overlap
    });

    const result = {
        products,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };

    productsCache.set(cacheKey, { data: result, timestamp: now });

    console.log('Products returned from database');

    return res.status(200).json(result);
};

const createProduct = async (req, res) => {
    const { name, price, category, stock, description } = req.body;
    const newProduct = await Product.create({
        name,
        price,
        category,
        stock,
        description,
        ownerId: req.user.id,
    });

    clearProductsCache();

    return res.status(201).json(newProduct);
};

const getProductById = async (req, res) => {
    // Also load the product's attributes (rows from product_attributes)
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductAttribute, as: 'attributes' }],
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    return res.json(product);
};

const updateProduct = async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!isOwner(product, req.user)) {
        return res.status(403).json({ message: 'You can only edit your own products' });
    }

    await product.update(req.body, { fields: PRODUCT_FIELDS });

    clearProductsCache();

    return res.json(product);
};

const deleteProduct = async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!isOwner(product, req.user)) {
        return res.status(403).json({ message: 'You can only delete your own products' });
    }

    await product.destroy();

    clearProductsCache();

    return res.json({ message: 'Product deleted' });
};

// All attributes of one product
const getProductAttributes = async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const attributes = await ProductAttribute.findAll({
        where: { productId: product.id },
        order: [['createdAt', 'ASC']],
    });

    return res.json(attributes);
};

// Adds one attribute, e.g. { "attributeName": "color", "attributeValue": "red" }
const addProductAttribute = async (req, res) => {
    const { attributeName, attributeValue } = req.body ?? {};

    if (typeof attributeName !== 'string' || attributeName.trim() === '') {
        return res.status(400).json({ message: 'attributeName is required' });
    }

    // The column is a string; numbers are fine too (e.g. pages: 320) and are saved as text
    if (typeof attributeValue !== 'string' && typeof attributeValue !== 'number') {
        return res.status(400).json({ message: 'attributeValue is required (string or number)' });
    }

    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (!isOwner(product, req.user)) {
        return res.status(403).json({ message: 'You can only add attributes to your own products' });
    }

    const attribute = await ProductAttribute.create({
        productId: product.id,
        attributeName: attributeName.trim(),
        attributeValue: String(attributeValue),
    });

    return res.status(201).json(attribute);
};

module.exports = {
    getProducts,
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    getProductAttributes,
    addProductAttribute
};
