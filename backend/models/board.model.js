import mongoose from "mongoose";

const boardSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minLength: 3,
            maxLength: 50
        },
        description: {
            type: String,
            trim: true,
            maxLength: 500
        },
        image: {
            type: String,
            default: ''
        },
        coverPhoto: {
            type: String,
            default: ''
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        admins: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        followers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        bannedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        size: {
            type: String,
            enum: ['100x100', '200x200', '300x300'],
            default: '200x200'
        },
        posts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post"
        }],
        privacy: {
            type: String,
            enum: ['public', 'followers', 'lists'],
            default: 'public'
        },
        allowedLists: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "List"
        }]
    },
    { timestamps: true }
);

const Board = mongoose.model("Board", boardSchema);

export default Board; 