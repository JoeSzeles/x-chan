const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const coverPhotoRoutes = require('./routes/coverPhotoRoutes');

// Add CSP middleware
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://platform.twitter.com https://www.youtube.com https://googleads.g.doubleclick.net; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https: blob: https://googleads.g.doubleclick.net https://i.4cdn.org; " +
        "frame-src 'self' https://www.youtube.com https://youtube.com https://platform.twitter.com https://googleads.g.doubleclick.net; " +
        "connect-src 'self' https://api.twitter.com https://platform.twitter.com https://www.youtube.com https://googleads.g.doubleclick.net https://i.4cdn.org;"
    );
    next();
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/cover-photo', coverPhotoRoutes);

// ... rest of the file ... 