require("dotenv").config();
const { connectMySQL, sequelize } = require("../config/db");
const User = require("../models/userModel");

const createAdmin = async () => {
    try {
        // Connects and creates the Users table if it doesn't exist yet
        await connectMySQL();

        const name = process.argv[4] || process.env.ADMIN_NAME;
        const email = process.argv[2] || process.env.ADMIN_EMAIL;
        const password = process.argv[3] || process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            console.error("Admin email and password are required");
            return;
        }

        const existingAdmin = await User.findOne({ where: { email: email.trim().toLowerCase() } });

        if (existingAdmin) {
            console.error("A user with this email already exists");
            return;
        }

        const admin = await User.create({
            name,
            email,
            password,
            role: "admin",
        });

        console.log(`Admin ${admin.email} created successfully`);
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await sequelize.close();
    }
};

createAdmin();
