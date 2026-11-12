require('dotenv').config();
const config = require("./config/config");
const { connectDB, connectMySQL } = require("./config/db");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const analytics = require("./middleware/analytics");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(analytics);


app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);


app.use(errorHandler);
app.use(notFound);

const PORT = config.port || 5000;

// Connect to the databases (and create MySQL tables) before accepting requests
const startServer = async () => {
    await connectDB();
    await connectMySQL();

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

startServer();
