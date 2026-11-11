module.exports = {
    port: process.env.PORT || 3000,
    mongoURI: process.env.MONGODB_URI || "mongodb://localhost:27017/myapp",
    jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "your_jwt_refresh_secret",
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    mysqlHost: process.env.DB_HOST || "localhost",
    mysqlPort: process.env.DB_PORT || 3306,
    mysqlDatabase: process.env.DB_NAME,
    mysqlUser: process.env.DB_USER || "root",
    mysqlPassword: process.env.DB_PASSWORD || "",
};