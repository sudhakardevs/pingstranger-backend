const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows any live frontend to connect
    methods: ["GET", "POST"]
  }
});

let waitingUser = null; 
const pairs = new Map(); 

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. MATCHMAKING REQUEST
  socket.on('find_stranger', () => {
    if (pairs.has(socket.id)) {
      const oldPartnerId = pairs.get(socket.id);
      io.to(oldPartnerId).emit('partner_disconnected');
      pairs.delete(oldPartnerId);
      pairs.delete(socket.id);
    }

    if (waitingUser && waitingUser !== socket.id) {
      const partnerId = waitingUser;
      waitingUser = null; 

      pairs.set(socket.id, partnerId);
      pairs.set(partnerId, socket.id);

      io.to(socket.id).emit('chat_start', { role: 'You matched with a stranger!' });
      io.to(partnerId).emit('chat_start', { role: 'You matched with a stranger!' });
      
      console.log(`Matched: ${socket.id} with ${partnerId}`);
    } else {
      waitingUser = socket.id;
      socket.emit('searching');
      console.log(`User ${socket.id} is waiting for a match...`);
    }
  });

  // 2. PASSING MESSAGES
  socket.on('send_message', (data) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit('receive_message', { text: data.text, sender: 'stranger' });
    }
  });

  // 3. HANDLING DISCONNECTS
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    if (pairs.has(socket.id)) {
      const partnerId = pairs.get(socket.id);
      io.to(partnerId).emit('partner_disconnected');
      pairs.delete(partnerId);
      pairs.delete(socket.id);
    }
  });
}); // <--- This is the closing tag that was causing the issue!

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Matchmaking server running on port ${PORT}`);
});