const User = require("../models/userModel");
const RefreshToken = require("../models/refreshTokenModel");
const { Op } = require("sequelize");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { EMAIL_REGEX } = require("../config/validation");

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth",
};

const generateTokens = async (user) => {
    const accessToken = jwt.sign(
        { id: user.id, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
        { id: user.id, jti: crypto.randomUUID() },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn }
    );

    const { exp } = jwt.decode(refreshToken);
    const expiresAt = new Date(exp * 1000);

    await RefreshToken.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
    });

    // MySQL has no TTL index like MongoDB, so clean up this user's expired tokens here
    await RefreshToken.destroy({
        where: { userId: user.id, expiresAt: { [Op.lt]: new Date() } },
    });

    return { accessToken, refreshToken, expiresAt };
};

const setRefreshCookie = (res, token, expiresAt) => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
        ...REFRESH_COOKIE_OPTIONS,
        maxAge: expiresAt.getTime() - Date.now(),
    });
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: "Name, email and password are required",
        });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            message: "Invalid email format",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // In Sequelize the filter goes inside "where"
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });

    if (existingUser) {
        return res.status(409).json({
            message: "A user with this email already exists",
        });
    }

    const user = await User.create({
        name,
        email: normalizedEmail,
        password,
    });

    return res.status(201).json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required",
        });
    }

    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });

    if (!user) {
        return res.status(401).json({
            message: "Invalid credentials",
        });
    }

    const isPasswordValid = await bcrypt.compare(
        password,
        user.password
    );

    if (!isPasswordValid) {
        return res.status(401).json({
            message: "Invalid credentials",
        });
    }

    const { accessToken, refreshToken, expiresAt } = await generateTokens(user);
    setRefreshCookie(res, refreshToken, expiresAt);

    return res.status(200).json({
        accessToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        },
    });
};

exports.refresh = async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!token) {
        return res.status(401).json({ message: "Refresh token not provided" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, config.jwtRefreshSecret);
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const storedToken = await RefreshToken.findOne({ where: { token } });

    if (!storedToken) {
        return res.status(401).json({ message: "Refresh token not recognized" });
    }

    await storedToken.destroy();

    const user = await User.findByPk(decoded.id);

    if (!user) {
        return res.status(401).json({ message: "User no longer exists" });
    }

    const { accessToken, refreshToken, expiresAt } = await generateTokens(user);
    setRefreshCookie(res, refreshToken, expiresAt);

    return res.status(200).json({ accessToken });
};

exports.logout = async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];

    if (token) {
        await RefreshToken.destroy({ where: { token } });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({ message: "Logged out" });
};
