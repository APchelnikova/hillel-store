const { DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const { sequelize } = require("../config/db");

// sequelize.define(name, columns, options) tells Sequelize to create/manage a table
// called "Users" (pluralized automatically) with the columns below.
// Sequelize also adds an auto-increment "id" primary key (Mongoose's "_id").
const User = sequelize.define("User", {
    name: {
        type: DataTypes.STRING,
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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            len: [8, 255]       // same as Mongoose's "minlength: 8"
        }
    },
    role: {
        type: DataTypes.STRING  // optional field, so allowNull stays true (the default)
    }
}, {
    timestamps: true            // same as Mongoose's "timestamps: true" (adds createdAt / updatedAt)
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

module.exports = User;