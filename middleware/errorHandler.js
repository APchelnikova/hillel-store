module.exports = (error, req, res, next) => {
    console.error(error);

    // Model validation failed (allowNull, len, isIn, ...),
    // same idea as Mongoose's "ValidationError"
    if (error.name === 'SequelizeValidationError') {
        const errors = Object.fromEntries(
            error.errors.map((fieldError) => [fieldError.path, fieldError.message])
        );

        return res.status(400).json({
            message: 'Validation Error',
            errors
        });
    }

    // A "unique: true" column got a duplicate value (e.g. the same email twice)
    if (error.name === 'SequelizeUniqueConstraintError') {
        const fields = error.errors.map((fieldError) => fieldError.path);

        return res.status(409).json({
            message: `Already exists: ${fields.join(', ')}`
        });
    }

    // A foreign key blocked the query, e.g. deleting a product that is used in an order
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
            message: 'This record is linked to other records and cannot be changed or deleted'
        });
    }

    res.status(500).json({ message: 'Internal server error' });

};
