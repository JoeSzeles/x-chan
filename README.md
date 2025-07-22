
# X-CHAN

A full-stack Twitter-4chan mashup application built with modern web technologies. This project combines the microblogging experience of Twitter with the unique thread-based discussion format of 4chan.
![GsuC1xRb0AAt2Nq](https://github.com/user-attachments/assets/3dfebf00-12f6-43b8-9ab5-ab5c34a4e6bc)
<img width="950" height="910" alt="Screenshot 2025-07-22 at 14-40-34 X-Chan" src="https://github.com/user-attachments/assets/1a48e437-a190-46c4-87fe-6ea6e7dca487" />
<img width="1902" height="921" alt="Screenshot 2025-07-22 at 14-39-45 X-Chan" src="https://github.com/user-attachments/assets/74191e21-13a5-4fca-b7d7-a7ea9d9c77ae" />
<img width="1894" height="918" alt="Screenshot 2025-07-22 at 14-38-59 X-Chan" src="https://github.com/user-attachments/assets/9c5ca724-d784-477b-aa67-d98d87a7a9bd" />
<img width="1902" height="912" alt="Screenshot 2025-07-22 at 14-38-45 X-Chan" src="https://github.com/user-attachments/assets/70abaf11-56ad-417b-a976-dac0f8040257" />
<img width="1897" height="909" alt="Screenshot 2025-07-22 at 14-38-32 X-Chan" src="https://github.com/user-attachments/assets/9621e593-3cd1-43d9-bbef-10f3d1cdcd62" />
<img width="1903" height="908" alt="Screenshot 2025-07-22 at 14-38-04 X-Chan" src="https://github.com/user-attachments/assets/a7e650bd-3581-44e5-9d32-4e3d21d92b2a" />
<img width="1896" height="912" alt="Screenshot 2025-07-22 at 14-37-40 X-Chan" src="https://github.com/user-attachments/assets/a2865e69-ab66-43cc-9c4d-4d4ae646d840" />
<img width="1881" height="891" alt="Screenshot 2025-07-22 at 14-37-10 X-Chan" src="https://github.com/user-attachments/assets/45e3f6a6-2667-489d-bce9-f81d69e51b3b" />



## Features

### Core Features
- **User Authentication**: Complete signup, login, logout system with JWT tokens
- **Posts & Comments**: Create, read, update, and delete posts with nested comment threads
- **Social Interactions**: Like, comment, repost, and bookmark functionality
- **4chan-Style Elements**: Post numbers, quote references, and thread-based discussions
- **User Profiles**: Customizable profiles with cover photos and bio information
- **Follow System**: Follow/unfollow users and view following feeds
- **Real-time Updates**: Live notifications and feed updates via Socket.io
- **Rich Text Editor**: Advanced text formatting with mentions, hashtags, and code blocks

### Advanced Features
- **Board System**: 4chan-style boards with external content integration
- **News Bot System**: Automated news aggregation with configurable bots
- **Search Functionality**: Advanced search across posts, users, and content
- **Bookmarks**: Save and organize favorite posts
- **Notifications**: Real-time notification system with read/unread states
- **Messages**: Direct messaging system between users
- **Services Marketplace**: User-created services with ratings and reviews
- **YouTube Integration**: Embedded YouTube videos with custom player
- **Image Handling**: Cloudinary-powered image storage and optimization
- **Responsive Design**: Mobile-first design that works across all devices
- **Dark/Light Themes**: Theme switching with user preferences
- **Wide Mode**: Optional wide layout for better content viewing

## Tech Stack

### Frontend
- **React.js** with Vite for fast development
- **Tailwind CSS** + **DaisyUI** for modern styling
- **TanStack Query** for efficient data fetching and caching
- **React Router** for client-side routing
- **Socket.io Client** for real-time features
- **React Hot Toast** for notifications
- **React Icons** for consistent iconography

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Cloudinary** for image storage and optimization
- **Multer** for file upload handling
- **Bcrypt** for password hashing
- **Axios** for external API requests

### External Integrations
- **4chan API** for board content
- **News APIs** for content aggregation
- **YouTube API** for video embedding
- **Cloudinary** for media management

## Prerequisites

Before running the application, ensure you have:
- **Node.js** (v16 or later)
- **npm** (v7 or later)
- **MongoDB** database
- **Cloudinary** account for image storage

## Environment Setup

Create a `.env` file in the `backend` directory with the following variables:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
NEWS_API_KEY=your_news_api_key
```

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/x-chan.git
   cd x-chan
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables** (see Environment Setup above)

4. **Start the development servers:**
   ```bash
   npm run dev
   ```

   This will start both backend and frontend servers concurrently.

## Development Commands

- `npm run dev` - Start both backend and frontend in development mode
- `npm run server` - Start only the backend server
- `npm run client` - Start only the frontend server
- `npm run build` - Build the frontend for production
- `npm start` - Start the production server

## Project Structure

```
x-chan/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── backend/                 # Express backend server
│   ├── controllers/        # Request handlers
│   ├── routes/            # API routes
│   ├── models/            # Mongoose data models
│   ├── middleware/        # Express middleware
│   ├── services/          # Business logic services
│   └── utils/             # Backend utilities
└── docs/                   # Project documentation
```

## Key Features Documentation

For detailed information about specific features, see the documentation in the `docs/` directory:

- **Application Architecture**: `docs/application_map.txt`
- **Post Number System**: `docs/post_number_system.md`
- **Board System**: `docs/boards_and_threads_system.md`
- **Rich Text Editor**: `docs/rich_text_system.md`
- **Theme System**: `docs/theme-specification.txt`
- **News Bot System**: `docs/bot-system-implementation.md`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get specific post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post

### Users
- `GET /api/users/profile/:username` - Get user profile
- `POST /api/users/follow/:id` - Follow/unfollow user
- `POST /api/users/update` - Update user profile

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

This application is designed to run on Replit. For deployment:

1. Push your code to the repository
2. The application will automatically build and deploy
3. Access your deployed app via the provided Replit URL

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **Twitter** and **4chan** for design inspiration
- **React** and **Node.js** communities for excellent tooling
- **Cloudinary** for reliable image hosting
- All open-source libraries that made this project possible

---

**X-Chan**: Where microblogging meets anonymous thread-based discussions in a modern, feature-rich platform.
