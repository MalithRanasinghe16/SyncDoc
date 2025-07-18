# SyncDoc Backend Setup Guide

## 🚀 Quick Setup

### 1. MongoDB Atlas Setup

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. **Create Cluster**: 
   - Click "Create" → Choose "M0 Sandbox" (Free tier)
   - Select your preferred cloud provider and region
   - Name your cluster (e.g., "syncdoc-cluster")
3. **Database Access**:
   - Go to "Database Access" → "Add New Database User"
   - Create username/password (save these!)
   - Grant "Read and write to any database" privileges
4. **Network Access**:
   - Go to "Network Access" → "Add IP Address"
   - For development: "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your specific IP addresses
5. **Get Connection String**:
   - Go to "Clusters" → Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string

### 2. Environment Configuration

Update `backend/.env` with your MongoDB connection:

```env
# Replace with your actual MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/syncdoc?retryWrites=true&w=majority

# Generate a secure JWT secret (use a random string generator)
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# Other settings
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Register a User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Documents
- `GET /api/documents` - Get all user's documents
- `GET /api/documents/:id` - Get specific document
- `POST /api/documents` - Create new document
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document
- `GET /api/documents/:id/versions` - Get document versions
- `POST /api/documents/:id/versions` - Create new version

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/search` - Search users
- `GET /api/users/online` - Get online users
- `POST /api/users/status` - Update online status

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - Prevents API abuse
- **Input Validation** - express-validator
- **CORS Protection** - Configured for frontend
- **Helmet** - Security headers

## 🚨 Troubleshooting

### MongoDB Connection Issues
1. Check your connection string format
2. Verify username/password are correct
3. Ensure IP address is whitelisted
4. Check if database name exists

### Port Already in Use
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rmdir /s node_modules
npm install
```

## 📁 Project Structure

```
backend/
├── models/
│   ├── User.js          # User schema
│   ├── Document.js      # Document schema
│   └── Version.js       # Version history schema
├── routes/
│   ├── auth.js          # Authentication routes
│   ├── documents.js     # Document CRUD routes
│   └── users.js         # User management routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env                 # Environment variables
```

## 🎯 Next Steps

1. **Frontend Integration**: Update frontend to use real API
2. **Real-time Features**: Implement Socket.io for live collaboration
3. **File Upload**: Add image/file upload capabilities
4. **Email Service**: Add email notifications
5. **Deployment**: Deploy to cloud platforms
