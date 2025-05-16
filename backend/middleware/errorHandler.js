export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Handle JSON parsing errors
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON data',
            details: err.message
        });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: err.message
        });
    }

    // Handle mongoose errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(400).json({
            success: false,
            error: 'Database Error',
            details: err.message
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Something went wrong!',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}; 