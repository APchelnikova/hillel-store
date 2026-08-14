const User = require('../models/userModel');

const getUsers = async (req, res) => {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
};

const createUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
        return res.status(409).json({ message: "A user with this email already exists" });
    }

    const newUser = new User({ name, email, password, role });
    await newUser.save();

    const { password: _password, ...safeUser } = newUser.toObject();
    return res.status(201).json(safeUser);
};

const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json(user);
};

const updateUser = async (req, res) => {
    const { name, email, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (password !== undefined) user.password = password;

    await user.save();

    const { password: _password, ...safeUser } = user.toObject();
    return res.json(safeUser);
};

const deleteUser = async (req, res) => {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "User deleted" });
};

module.exports = { getUsers, createUser, getUserById, updateUser, deleteUser };
