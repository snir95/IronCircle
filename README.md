# IronCircle - Real-time Chat Application

A real-time chat application built with Vue.js, Node.js, Express, and Socket.IO.

## 🏗️ Project Structure

```
IronCircle/
├── client/          # Vue.js frontend
├── Server/          # Node.js backend
├── docker-compose.yml
└── docker-compose.prod.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Development Setup

1. **Install dependencies:**
   ```bash
   # Install server dependencies
   cd Server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

2. **Start the development servers:**
   ```bash
   # Terminal 1 - Start the backend server
   cd Server
   npm run dev
   
   # Terminal 2 - Start the frontend development server
   cd client
   npm run serve
   ```

3. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend: http://localhost:3001

## 🐳 Docker Setup

### Development
```bash
docker-compose up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up
```

## 📁 Directory Structure

### Client (`/client`)
- Vue.js 3 with TypeScript
- Socket.IO client for real-time communication
- ESLint + Prettier for code formatting

### Server (`/Server`)
- Node.js with Express
- Socket.IO server for real-time communication
- TypeScript for type safety
- CORS enabled for cross-origin requests

## 🔧 Available Scripts

### Client
- `npm run serve` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint

### Server
- `npm run dev` - Start development server with nodemon
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

## 🌟 Features

- ✅ Real-time messaging
- ✅ TypeScript support
- ✅ Docker containerization
- ✅ Hot reloading (development)
- ✅ Cross-origin resource sharing (CORS)

## 🔮 Planned Features

- [ ] User authentication
- [ ] Message persistence (MongoDB)
- [ ] User profiles
- [ ] Typing indicators
- [ ] Read receipts
- [ ] File sharing
- [ ] Message reactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
