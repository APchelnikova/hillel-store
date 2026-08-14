const Product = require('../models/productModel');

const productsCache = new Map();
const CACHE_TTL = 30 * 1000;

const clearProductsCache = () => {
    productsCache.clear();
};

const getProducts = async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { category } = req.query;

    const filter = category ? { category } : {};
    const cacheKey = JSON.stringify({ page, limit, category: category || null });

    const now = Date.now();
    const cached = productsCache.get(cacheKey);

    if (cached && now - cached.timestamp < CACHE_TTL) {
        console.log('Products returned from cache');

        return res.json(cached.data);
    }

    const [products, total] = await Promise.all([
        Product.find(filter).skip((page - 1) * limit).limit(limit),
        Product.countDocuments(filter),
    ]);

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
    const { name, price, category, stock } = req.body;
    const newProduct = new Product({ name, price, category, stock });
    await newProduct.save();

    clearProductsCache();

    return res.status(201).json(newProduct);
};

const getProductById = async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    return res.json(product);
};

const updateProduct = async (req, res) => {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Product not found' });

    clearProductsCache();

    return res.json(updatedProduct);
};

const deleteProduct = async (req, res) => {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Product not found' });

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
