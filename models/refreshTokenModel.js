const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const User = require("./userModel");

// This table doesn't exist in the database yet, sequelize.sync() creates it
// as "refresh_tokens" on the first start.
const RefreshToken = sequelize.define("RefreshToken", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    token: {
        // A JWT can be longer than the default 255 chars of STRING, so give it more room
        type: DataTypes.STRING(512),
        allowNull: false,                         // same as Mongoose's "required: true"
        unique: true                              // same as Mongoose's "unique: true"
    },
    userId: {
        // Plain CHAR(36), not DataTypes.UUID: in MySQL UUID becomes "CHAR(36) BINARY"
        // with a different collation than users.id, and MySQL refuses a foreign key
        // between columns with different collations.
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: "users", key: "id" } // same as Mongoose's "ref: 'User'"
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
        // Mongoose's "index: { expires: 0 }" (TTL index) made MongoDB delete expired
        // tokens by itself. MySQL has no such feature, so expired tokens are removed
        // in authController (generateTokens).
    }
}, {
    tableName: "refresh_tokens",
    timestamps: false,                            // the Mongoose schema had no timestamps either
    underscored: true                             // userId -> user_id, expiresAt -> expires_at
});

// One user has many refresh tokens; each token belongs to one user.
// onDelete: "CASCADE" removes the user's tokens when the user row is deleted.
User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = RefreshToken;
