# SyncDoc - Real-time Collaborative Document Editor

<div align="center">
  <img src="https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="CollabDoc Banner" width="800" height="300" style="object-fit: cover; border-radius: 12px;">
  
  <h3>A modern, real-time collaborative document editor built with React, Node.js, and Yjs</h3>
  
  [![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
  [![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg)](https://vitejs.dev/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## ✨ Features

### 🚀 Core Functionality
- **Real-time Collaboration** - Multiple users can edit documents simultaneously with live cursors and instant updates
- **Rich Text Editor** - Powered by Quill with full formatting capabilities
- **Google OAuth Authentication** - Secure login with Google accounts
- **Document Management** - Create, edit, share, and organize documents
- **Version History** - Track changes and revert to previous versions
- **User Presence** - See who's online and actively editing

### 🎨 Design & UX
- **Modern Interface** - Clean, intuitive design inspired by Google Docs and Notion
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme** - Customizable appearance preferences
- **Smooth Animations** - Micro-interactions and transitions throughout
- **Accessibility** - WCAG compliant with keyboard navigation support

### 🔧 Technical Features
- **TypeScript** - Full type safety and enhanced developer experience
- **State Management** - Zustand for efficient state handling
- **Real-time Sync** - Yjs and WebSockets for conflict-free collaborative editing
- **API Integration** - RESTful API with automatic token management
- **Error Handling** - Comprehensive error boundaries and user feedback

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Zustand** - Lightweight state management
- **React Quill** - Rich text editor component
- **Yjs** - Conflict-free replicated data types for real-time collaboration

### Backend (To be implemented)
- **Node.js** - JavaScript runtime
- **Express** - Web application framework
- **MongoDB** - NoSQL database
- **Socket.IO** - Real-time bidirectional communication
- **JWT** - JSON Web Tokens for authentication
- **Google OAuth 2.0** - Authentication provider

### Deployment
- **Frontend**: 
- **Backend**: 
- **Database**: MongoDB Atlas
- **Storage**: 

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google OAuth 2.0 credentials
- MongoDB database (local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MalithRanasinghe16/SyncDoc.git
   cd SyncDoc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_WS_URL=ws://localhost:3001
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
SYNCDOC/project
├── node_modules/        # Project dependencies
├── src/                 # Source code directory
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React context providers
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main application component
│   ├── index.css       # Global styles and Tailwind imports
│   └── main.tsx        # Application entry point
├── .gitignore          # Git ignore rules
├── eslint.config.js    # ESLint configuration
├── index.html          # HTML template
├── package-lock.json   # Dependency lock file
├── package.json        # Project configuration and dependencies
├── postcss.config.js   # PostCSS configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.app.json   # TypeScript app configuration
├── tsconfig.json       # TypeScript base configuration
├── tsconfig.node.json  # TypeScript Node configuration
└── vite.config.ts      # Vite build configuration
```

## 🔧 Configuration

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5173` (development)
   - `https://yourdomain.com` (production)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `VITE_API_BASE_URL` | Backend API base URL | Yes |
| `VITE_WS_URL` | WebSocket server URL | Yes |

## 🎯 Usage

### Creating Documents
1. Sign in with your Google account
2. Click "New Document" on the dashboard
3. Start typing in the editor
4. Documents auto-save every 2 seconds

### Collaborating
1. Click "Share" in the editor
2. Enter collaborator email addresses
3. Set permissions (view, comment, edit)
4. Collaborators receive real-time updates

### Version History
1. Click "History" in the editor toolbar
2. Browse previous versions by timestamp
3. Click any version to preview
4. Revert to a previous version if needed

## 🚀 Deployment

### Frontend Deployment (Netlify)

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod --dir=dist
   ```

### Environment Variables for Production
Set these in your deployment platform:
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL`
- `VITE_WS_URL`

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style
- ESLint configuration for React and TypeScript
- Prettier for code formatting
- Tailwind CSS for styling
- Conventional commit messages

### Testing
```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📋 Roadmap

### Phase 1 - Core Features ✅
- [x] User authentication with Google OAuth
- [x] Document creation and management
- [x] Rich text editor with Quill
- [x] Responsive design
- [x] Settings and user preferences

### Phase 2 - Collaboration (In Progress)
- [ ] Real-time collaborative editing with Yjs
- [ ] User presence and cursors
- [ ] Document sharing and permissions
- [ ] Comments and suggestions

### Phase 3 - Advanced Features
- [ ] Version history and rollback
- [ ] Document templates
- [ ] Export to PDF/Word
- [ ] Advanced formatting options
- [ ] Plugin system

### Phase 4 - Enterprise
- [ ] Team workspaces
- [ ] Admin dashboard
- [ ] Analytics and insights
- [ ] SSO integration
- [ ] API for third-party integrations

## 🐛 Known Issues

- Real-time collaboration requires backend implementation
- Version history is currently a placeholder
- File upload functionality pending
- Mobile editor experience needs optimization


## 🙏 Acknowledgments

- [Quill](https://quilljs.com/) - Rich text editor
- [Yjs](https://github.com/yjs/yjs) - Shared data types for real-time collaboration
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Lucide React](https://lucide.dev/) - Beautiful icon library
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [React OAuth Google](https://github.com/MomenSherif/react-oauth) - Google authentication


<div align="center">
  <p>Made with ❤️ by the SyncDoc team</p>
  <p>
    <a href="https://github.com/yourusername/collabdoc">⭐ Star us on GitHub</a> •
  </p>
</div>
