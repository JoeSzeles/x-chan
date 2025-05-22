
# X-CHAN

A full-stack Twitter-4chan mashup application built with modern web technologies. This project combines the microblogging experience of Twitter with the unique thread-based discussion format of 4chan.

## Features

- User authentication (signup, login, logout)
- Create, read, update, and delete posts
- Like, comment, and repost functionality
- 4chan-style post numbers and quotes
- Thread-based discussions
- User profiles with customizable cover photos
- Follow/unfollow users
- Real-time feed updates
- Bookmarks and notifications
- News bots for content aggregation
- Board system similar to 4chan
- Responsive design for mobile and desktop
- Custom favicon and branding

## Tech Stack

- **Frontend:**
  - React.js with Vite
  - Tailwind CSS for styling
  - Axios for API requests
  - Socket.io client for real-time features

- **Backend:**
  - Node.js
  - Express.js
  - MongoDB for database
  - Mongoose as ODM
  - JSON Web Tokens (JWT) for authentication
  - Socket.io for real-time updates
  - Cloudinary for image storage

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or later)
- npm (v6 or later)
- MongoDB

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/x-chan.git
   cd x-chan
   ```

2. Install dependencies for the backend:
   ```
   cd backend
   npm install
   ```

3. Install dependencies for the frontend:
   ```
   cd ../frontend
   npm install
   ```

4. Set up environment variables:
   - Create a `.env` file in the `backend` directory
   - Add necessary environment variables (e.g., MongoDB URI, JWT secret, PORT, Cloudinary credentials)

## Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000` to view the application.

## Project Structure

- `frontend/` - React frontend application
  - `src/components/` - Reusable UI components
  - `src/pages/` - Page components
  - `src/hooks/` - Custom React hooks
  - `src/services/` - API services
  - `src/utils/` - Utility functions

- `backend/` - Express backend server
  - `controllers/` - Request handlers
  - `routes/` - API routes
  - `models/` - Mongoose data models
  - `middleware/` - Express middleware
  - `public/` - Static files and uploads

- `docs/` - Project documentation

## Documentation

For detailed documentation on the application architecture and components, refer to the files in the `docs/` directory, particularly:
- `application_map.txt` - Overall application structure
- `post_number_system.md` - 4chan-style post numbering
- `board_and_threads_system.md` - Board system details

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Twitter and 4chan for inspiration
- All open-source libraries used in this project

---

X-Chan: Where microblogging meets anonymous thread-based discussions.
