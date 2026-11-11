const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const User = require("./userModel");

// sequelize.define(name, columns, options) tells Sequelize to create/manage a table
// called "RefreshTokens" (pluralized automatically) with the columns below.
const RefreshToken = sequelize.define("RefreshToken", {
    token: {
        // A JWT can be longer than the default 255 chars of STRING, so give it more room
        type: DataTypes.STRING(512),
        allowNull: false,                         // same as Mongoose's "required: true"
        unique: true                              // same as Mongoose's "unique: true"
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" } // same as Mongoose's "ref: 'User'"
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
        // Mongoose's "index: { expires: 0 }" (TTL index) made MongoDB delete expired
        // tokens by itself. MySQL has no such feature, so expired rows have to be
        // removed manually, e.g.:
        // RefreshToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } })
    }
}, {
    timestamps: false                             // the Mongoose schema had no timestamps either
});

// One user has many refresh tokens; each token belongs to one user.
// onDelete: "CASCADE" removes the user's tokens when the user is deleted.
User.hasMany(RefreshToken, { foreignKey: "userId", onDelete: "CASCADE" });
RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = RefreshToken;
