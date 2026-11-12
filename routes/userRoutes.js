const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
    getMe,
    getUsers,
    updateUser,
    deleteUser,
    createUser,
    getUserById,
    updateMySettings
} = require("../controllers/userController");

router.get("/me", authMiddleware, getMe);
router.patch("/me/settings", authMiddleware, updateMySettings);

router.get("/:id", authMiddleware, getUserById);
router.get("/", authMiddleware, roleMiddleware("admin"), getUsers);
router.post("/", authMiddleware, roleMiddleware("admin"), createUser);
router.put("/:id", authMiddleware, roleMiddleware("admin"), updateUser);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteUser);

module.exports = router;
