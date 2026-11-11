const User = require('../models/userModel');

// Sequelize's version of Mongoose's .select("-password")
const WITHOUT_PASSWORD = { attributes: { exclude: ['password'] } };

const toSafeUser = (user) => {
    const { password: _password, ...safeUser } = user.toJSON();
    return safeUser;
};

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

    return res.status(201).json(toSafeUser(newUser));
};

const getUserById = async (req, res) => {
    const user = await User.findByPk(req.params.id, WITHOUT_PASSWORD);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
};

const updateUser = async (req, res) => {
    const { name, email, password } = req.body;

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;

    // save() runs the "beforeSave" hook, so a new password gets hashed
    await user.save();

    return res.json(toSafeUser(user));
};

const deleteUser = async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();

    return res.json({ message: "User deleted" });
};

module.exports = { getUsers, createUser, getUserById, updateUser, deleteUser };
