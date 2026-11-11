require('dotenv').config();
const config = require("./config");
const mongoose = require('mongoose');
const { Sequelize } = require("sequelize");

// Create a single Sequelize instance for the whole app.
const sequelize = new Sequelize(
    config.mysqlDatabase,       // name of the database
    config.mysqlUser,           // MySQL username, e.g. "root"
    config.mysqlPassword, {
        host: config.mysqlHost, // e.g. "127.0.0.1"
        port: config.mysqlPort, // e.g. 3306
        dialect: "mysql",       // tells Sequelize we're using MySQL (not Postgres/SQLite/etc.)
        logging: false,         // set this to console.log if you want to see the raw SQL queries in the terminal
    }
);

const connectDB = async () => {
    try {
        await mongoose.connect(config.mongoURI);
        console.log('Database:', mongoose.connection.name);
        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};

const connectMySQL = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ MySQL connected");

        // sync() creates a table for every model that was require()'d before this call,
        // if that table doesn't exist yet (CREATE TABLE IF NOT EXISTS).
        // It does NOT change existing tables. While developing you can use:
        //   sync({ alter: true }) - updates tables to match the models
        //   sync({ force: true }) - drops and recreates all tables (deletes all data!)
        await sequelize.sync();
        console.log("✅ MySQL tables synced");
    } catch (error) {
        console.error("❌ MySQL connection error:", error);
        process.exit(1);
    }
};

module.exports = { connectDB, connectMySQL, sequelize };
