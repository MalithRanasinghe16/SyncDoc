# SyncDoc - Collaborative Document Editor

A modern, real-time collaborative document editor built with React, TypeScript, Node.js, Express, and MongoDB Atlas.

## Features

- **User Authentication** - JWT-based authentication with registration and login
- **Document Management** - Create, edit, delete, and organize documents
- **Real-time Collaboration** - Share documents and collaborate in real-time
- **Version History** - Track document changes and restore previous versions
- **Rich Text Editor** - Full-featured editor with formatting tools
- **Auto-save** - Automatic saving of document changes
- **Responsive Design** - Works on desktop and mobile devices

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hook Form** for form handling

### Backend
- **Node.js** with Express
- **MongoDB Atlas** for database
- **Mongoose** for ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SyncDoc
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../project
   npm install
   ```

4. **Set up environment variables**

   **Backend** (`backend/.env`):
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   PORT=3001
   NODE_ENV=development
   ```

   **Frontend** (`project/.env`):
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_WS_URL=ws://localhost:3001
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

5. **Start the development servers**

   **Option 1: Use the batch script (Windows)**
   ```bash
   start-full-app.bat
   ```

   **Option 2: Start manually**
   
   Backend:
   ```bash
   cd backend
   npm run dev
   ```
   
   Frontend (in another terminal):
   ```bash
   cd project
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Project Structure

```
SyncDoc/
├── backend/                # Express.js backend
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── server.js           # Server entry point
│   └── package.json
├── project/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── public/
│   └── package.json
├── README.md
└── start-full-app.bat      # Development startup script
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - Get user's documents
- `POST /api/documents` - Create new document
- `GET /api/documents/:id` - Get specific document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Versions
- `GET /api/documents/:id/versions` - Get document versions
- `POST /api/documents/:id/versions` - Create new version

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Development

### Frontend Development
```bash
cd project
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon
npm start          # Start production server
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please create an issue in the GitHub repository.
