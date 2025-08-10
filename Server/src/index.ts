import express from 'express';
import type { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const app: Express = express();
app.use(cors()); 

const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", 
    methods: ["GET", "POST"]
  }
});

const PORT: number | string = process.env.PORT || 3001;

app.get('/', (req: Request, res: Response) => {
  res.send('<h1>Chat Server is running (TypeScript)</h1>');
});

io.on('connection', (socket) => {
    console.log('A user connected with socket ID:', socket.id);
  
    socket.on('chat message', (msg: string) => { 
      console.log('message: ' + msg);
      // Broadcast the message to all connected clients
      io.emit('chat message', msg);
    });
  
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});