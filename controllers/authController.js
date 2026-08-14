const User = require("../models/userModel");
const RefreshToken = require("../models/refreshTokenModel");
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
        { id: user._id, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );

    const refreshToken = jwt.sign(
        { id: user._id, jti: crypto.randomUUID() },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn }
    );

    const { exp } = jwt.decode(refreshToken);
    const expiresAt = new Date(exp * 1000);

    await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt,
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

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
        return res.status(409).json({
            message: "A user with this email already exists",
        });
    }

    const user = new User({
        name,
        email: normalizedEmail,
        password,
    });

    await user.save();

    return res.status(201).json({
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
        },
    });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase() });

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
            id: user._id,
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

    const storedToken = await RefreshToken.findOne({ token });

    if (!storedToken) {
        return res.status(401).json({ message: "Refresh token not recognized" });
    }

    await RefreshToken.deleteOne({ _id: storedToken._id });

    const user = await User.findById(decoded.id);

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
        await RefreshToken.deleteOne({ token });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({ message: "Logged out" });
};
