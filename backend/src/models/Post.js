const postSchema = new mongoose.Schema({
    // ... other fields ...
    isDefaultPost: {
        type: Boolean,
        default: false
    },
    // ... rest of the schema ...
}); 