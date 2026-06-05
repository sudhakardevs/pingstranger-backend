// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL of your Vite React frontend
    methods: ["GET", "POST"]
  }
});

let waitingUser = null; // Keeps track of a single user waiting for a match
const pairs = new Map(); // Tracks active chats: Map(socketId -> partnerSocketId)

const io = new Server(server, {
  cors: {
    origin: "*", // Allows any live frontend to handshake with your server
    methods: ["GET", "POST"]
  }
});
  // 1. MATCHMAKING REQUEST
  socket.on('find_stranger', () => {
    // If the user is already in a chat, disconnect them first
    if (pairs.has(socket.id)) {
      const oldPartnerId = pairs.get(socket.id);
      io.to(oldPartnerId).emit('partner_disconnected');
      pairs.delete(oldPartnerId);
      pairs.delete(socket.id);
    }

    // If someone is already waiting in the lobby, match them up!
    if (waitingUser && waitingUser !== socket.id) {
      const partnerId = waitingUser;
      waitingUser = null; // Clear the lobby

      // Link them together in memory
      pairs.set(socket.id, partnerId);
      pairs.set(partnerId, socket.id);

      // Tell both users they found a match
      io.to(socket.id).emit('chat_start', { role: 'You matched with a stranger!' });
      io.to(partnerId).emit('chat_start', { role: 'You matched with a stranger!' });
      
      console.log(`Matched: ${socket.id} with ${partnerId}`);
    } else {
      // Nobody is waiting, so this user becomes the waiting user
      waitingUser = socket.id;
      socket.emit('searching');
      console.log(`User ${socket.id} is waiting for a match...`);
    }
  });

  // 2. PASSING MESSAGES
  socket.on('send_message', (data) => {
    const partnerId = pairs.get(socket.id);
    if (partnerId) {
      // Send the message directly to the partner's socket ID
      io.to(partnerId).emit('receive_message', { text: data.text, sender: 'stranger' });
    }
  });

  // 3. HANDLING DISCONNECTS
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // If they were waiting in the lobby, clear it
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    // If they were chatting, notify their partner
    if (pairs.has(socket.id)) {
      const partnerId = pairs.get(socket.id);
      io.to(partnerId).emit('partner_disconnected');
      pairs.delete(partnerId);
      pairs.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Matchmaking server running on port ${PORT}`);
});