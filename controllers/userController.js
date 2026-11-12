const User = require('../models/userModel');

// Sequelize's version of Mongoose's .select("-password")
const WITHOUT_PASSWORD = { attributes: { exclude: ['password'] } };

const PUBLIC_PROFILE = { attributes: ['id', 'name', 'role', 'createdAt'] };

const getUsers = async (req, res) => {
    const users = await User.findAll(WITHOUT_PASSWORD);
    return res.status(200).json(users);
};

const createUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
    }

    const newUser = await User.create({ name, email, password, role });

    return res.status(201).json(newUser);
};

const getUserById = async (req, res) => {
    const user = await User.findByPk(req.params.id, PUBLIC_PROFILE);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
};

const getMe = async (req, res) => {
    const user = await User.findByPk(req.user.id, WITHOUT_PASSWORD);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
};

const updateMySettings = async (req, res) => {
    const changes = req.body;

    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
        return res.status(400).json({ message: "Settings must be a JSON object" });
    }

    const user = await User.findByPk(req.user.id, WITHOUT_PASSWORD);
    if (!user) return res.status(404).json({ message: "User not found" });

    const settings = { ...(user.settings || {}), ...changes };
    for (const key of Object.keys(changes)) {
        if (changes[key] === null) delete settings[key];
    }

    user.settings = settings;
    await user.save();

    return res.json(user.settings);
};

const updateUser = async (req, res) => {
    const { name, email, password } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;

    await user.save();

    return res.json(user);
};

const deleteUser = async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();

    return res.json({ message: "User deleted" });
};

module.exports = { getUsers, createUser, getUserById, getMe, updateMySettings, updateUser, deleteUser };
