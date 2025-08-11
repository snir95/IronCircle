# IronCircle - Real-Time Chat Application

A scalable, secure real-time chat application built with Node.js, Vue.js, and WebSocket technology.

## 🚀 Features

### Core Features
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure JWT-based authentication system
- **Channel Management**: Create, join, and manage public/private channels
- **Private Messaging**: Direct messaging between users
- **User Status**: Real-time online/offline status indicators
- **Typing Indicators**: See when users are typing
- **Message History**: Persistent message storage in MongoDB
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Advanced Features
- **Message Persistence**: All messages are stored and retrieved from database
- **User Search**: Find and start conversations with other users
- **Channel Search**: Discover and join channels
- **Modern UI**: Beautiful, intuitive interface with smooth animations
- **Real-time Notifications**: Instant updates for new messages and user status

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **TypeScript** - Type safety and better development experience

### Frontend
- **Vue.js 3** - Progressive JavaScript framework
- **Vuex** - State management
- **Vue Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **TypeScript** - Type safety
- **CSS3** - Modern styling with gradients and animations

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **MongoDB** - Database container

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Docker** and **Docker Compose** (for containerized deployment)
- **MongoDB** (if running locally without Docker)

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IronCircle
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files
   cp Server/env.example Server/.env
   cp client/env.example client/.env
   
   # Edit the files with your configuration
   # Server/.env
   JWT_SECRET=your-super-secret-jwt-key
   MONGODB_URI=mongodb://mongo:27017/ironcircle
   
   # client/.env
   VUE_APP_API_URL=http://localhost:3001/api
   VUE_APP_SOCKET_URL=http://localhost:3001
   ```

3. **Start the application**
   ```bash
   # Development mode
   npm run docker:dev
   
   # Production mode
   npm run docker:prod
   ```

4. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001
   - MongoDB: localhost:27017

### Option 2: Local Development

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables** (same as Docker option)

3. **Start MongoDB** (if not using Docker)
   ```bash
   # Start MongoDB service
   mongod
   ```

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start individually
   npm run dev:server  # Backend only
   npm run dev:client  # Frontend only
   ```

## 📁 Project Structure

```
IronCircle/
├── client/                 # Vue.js frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── views/          # Page components
│   │   ├── store/          # Vuex store
│   │   ├── router/         # Vue Router
│   │   └── assets/         # Static assets
│   ├── public/             # Public files
│   └── package.json        # Frontend dependencies
├── Server/                 # Node.js backend
│   ├── src/
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   └── index.ts        # Server entry point
│   └── package.json        # Backend dependencies
├── docker-compose.yml      # Development Docker setup
├── docker-compose.prod.yml # Production Docker setup
└── package.json            # Root package.json
```

## 🔧 Configuration

### Environment Variables

#### Server (.env)
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ironcircle
JWT_SECRET=your-super-secret-jwt-key
CORS_ORIGIN=http://localhost:8080
```

#### Client (.env)
```env
VUE_APP_API_URL=http://localhost:3001/api
VUE_APP_SOCKET_URL=http://localhost:3001
```

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user profile

### Channel Endpoints

#### GET /api/channels
Get all accessible channels

#### POST /api/channels
Create a new channel
```json
{
  "name": "general",
  "description": "General discussion",
  "isPrivate": false
}
```

#### GET /api/channels/:channelId/messages
Get channel messages

#### POST /api/channels/:channelId/join
Join a channel

#### POST /api/channels/:channelId/leave
Leave a channel

### User Endpoints

#### GET /api/users
Get all users

#### GET /api/users/search?q=query
Search users

#### GET /api/users/profile
Get current user profile

#### PUT /api/users/profile
Update user profile

## 🔌 WebSocket Events

### Client to Server
- `authenticate` - Authenticate user with JWT token
- `join_channel` - Join a channel
- `leave_channel` - Leave a channel
- `send_message` - Send message to channel
- `private_message` - Send private message
- `typing` - Typing indicator

### Server to Client
- `authenticated` - Authentication result
- `new_message` - New channel message
- `private_message` - New private message
- `user_typing` - User typing indicator
- `user_online` - User came online
- `user_offline` - User went offline

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd Server
npm test

# Frontend tests
cd client
npm run test:unit
```

## 🚀 Deployment

### Production Build
```bash
# Build both frontend and backend
npm run build

# Start production containers
npm run docker:prod
```

### Environment Variables for Production
Make sure to update the following for production:
- `JWT_SECRET` - Use a strong, unique secret
- `MONGODB_URI` - Use production MongoDB instance
- `NODE_ENV=production`
- `CORS_ORIGIN` - Set to your production domain

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcryptjs for password security
- **CORS Protection** - Configured CORS for security
- **Input Validation** - Server-side validation for all inputs
- **SQL Injection Protection** - MongoDB with Mongoose ODM
- **XSS Protection** - Vue.js built-in XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Include your environment details and error logs

## 🎯 Roadmap

### Planned Features
- [ ] File upload support (images, videos, documents)
- [ ] Message editing and deletion
- [ ] Message reactions and emojis
- [ ] Push notifications
- [ ] Message search functionality
- [ ] User avatars and profiles
- [ ] Channel categories and organization
- [ ] Message threading
- [ ] Voice and video calls
- [ ] Mobile app (React Native)

### Performance Improvements
- [ ] Message pagination
- [ ] Redis caching
- [ ] CDN for file uploads
- [ ] Database indexing optimization
- [ ] WebSocket connection pooling

---

**Built with ❤️ using modern web technologies**
