# Backend Environment Setup Guide

## Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the .env file with your actual values:**
   - Replace all placeholder values with your real credentials
   - Never commit the actual .env file to version control

## Environment Variables Explained

### MongoDB Atlas Setup
```env
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/YOUR_DATABASE_NAME?retryWrites=true&w=majority&appName=YOUR_APP_NAME
```

**How to get these values:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Go to Database Access → Add Database User
4. Go to Network Access → Add IP Address (0.0.0.0/0 for development)
5. Go to Database → Connect → Connect your application
6. Copy the connection string and replace placeholders

**Important:** URL encode special characters in your password:
- `@` becomes `%40`
- `!` becomes `%21`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`

### JWT Secret
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Google OAuth (Optional)
```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**How to get Google OAuth credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set authorized redirect URIs: `http://localhost:3001/auth/google/callback`

## Security Best Practices

1. **Never commit .env files** - They're already in .gitignore
2. **Use strong passwords** - Minimum 12 characters with mixed case, numbers, symbols
3. **Rotate secrets regularly** - Especially in production
4. **Use environment-specific values** - Different secrets for dev/staging/production
5. **Limit database access** - Use specific IP allowlists in production

## Troubleshooting

### Common Issues:

**MongoDB Connection Failed:**
- Check if your IP is allowlisted in MongoDB Atlas
- Verify username/password are correct
- Ensure password is URL encoded

**JWT Token Issues:**
- Make sure JWT_SECRET is at least 32 characters
- Don't use simple passwords like "secret123"

**Port Already in Use:**
- Change PORT value in .env
- Kill existing processes: `npx kill-port 3001`

### Testing Your Setup:
```bash
npm run dev
```

The server should start without errors and connect to MongoDB.
