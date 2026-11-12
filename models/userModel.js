const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const { sequelize } = require("../config/db");

// sequelize.define(name, columns, options) tells Sequelize to manage the table
// "users" (set with tableName below) with the columns below.
const User = sequelize.define("User", {
    id: {
        // The table uses UUIDs (char(36)) instead of auto-increment numbers.
        // UUIDV4 makes Sequelize generate a new random id for every new user
        // (like Mongoose generating "_id" automatically).
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false        // same as Mongoose's "required: true"
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,           // same as Mongoose's "unique: true"
        // A setter runs every time the value is assigned.
        // Replaces Mongoose's "lowercase: true" and "trim: true".
        set(value) {
            this.setDataValue("email", typeof value === "string" ? value.trim().toLowerCase() : value);
        }
    },
    password: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [8, 255]       // same as Mongoose's "minlength: 8"
        }
    },
    role: {
        type: DataTypes.STRING  // optional field, so allowNull stays true (the default)
    },
    settings: {
        // JSON column: you can save a plain JS object here, e.g. { theme: "dark" }
        type: DataTypes.JSON
    }
}, {
    tableName: "users",         // use the existing table name as is
    timestamps: true,           // same as Mongoose's "timestamps: true" (createdAt / updatedAt)
    underscored: true,          // createdAt -> created_at, updatedAt -> updated_at in the table
    // "Soft delete": user.destroy() doesn't remove the row, it only fills "deleted_at".
    // Such users are then skipped by findAll(), findOne(), findByPk(), etc.
    paranoid: true
});

// Hooks are Sequelize's version of Mongoose middleware.
// "beforeSave" runs before both create() and save(), like userSchema.pre("save").
// Validation runs before this hook, so the 8-char check sees the plain password.
// Note: static User.update(...) skips this hook unless you pass { individualHooks: true }.
User.addHook("beforeSave", async (user) => {
    // user.changed("password") is the same as Mongoose's this.isModified("password")
    if (!user.changed("password")) return;

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
});

// Instance methods go on the prototype (Mongoose's "userSchema.methods").
User.prototype.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// toJSON() is what res.json(user) uses to turn the user into JSON.
// We drop the password hash here, so it never gets into an API response,
// even if a controller forgets to remove it.
// (Like Mongoose's "toJSON: { transform }" schema option.)
User.prototype.toJSON = function () {
    const { password: _password, ...safeUser } = this.get({ plain: true });
    return safeUser;
};

module.exports = User;
