const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const coverPhotoRoutes = require('./routes/coverPhotoRoutes');



// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/cover-photo', coverPhotoRoutes);

// ... rest of the file ... 