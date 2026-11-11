const Product = require('../models/productModel');
const ProductAttribute = require('../models/productAttributeModel');

const productsCache = new Map();
const CACHE_TTL = 30 * 1000;

// Fields a client is allowed to set (so req.body can't overwrite id, createdAt, etc.)
const PRODUCT_FIELDS = ['name', 'price', 'category', 'stock', 'description'];

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
        ownerId: req.user.id, // the logged-in admin who creates the product
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

    await product.update(req.body, { fields: PRODUCT_FIELDS });

    clearProductsCache();

    return res.json(product);
};

const deleteProduct = async (req, res) => {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await product.destroy();

    clearProductsCache();

    return res.json({ message: 'Product deleted' });
};

module.exports = {
    getProducts,
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct
};
