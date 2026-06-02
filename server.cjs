const express = require("express");
const app = express();

// Imports
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions.cjs");

const server = http.createServer(app);

// Socket.io setup with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve Vite build files
app.use(express.static(path.join(__dirname, "dist")));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Store connected users
const userSocketMap = {};

// Get all connected clients in a room
function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    },
  );
}

// Socket connection

io.on("connection", (socket) => {
  console.log("SOCKET CONNECTED:", socket.id);

  // Join room

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    console.log("JOIN RECEIVED");
    console.log("roomId:", roomId);
    console.log("username:", username);

    userSocketMap[socket.id] = username;

    socket.join(roomId);

    const clients = getAllConnectedClients(roomId);

    console.log("clients in room:", clients);

    // Emit joined event to all clients in room
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // Listen for code changes
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Listen for language changes
  socket.on("language_change", ({ roomId, languageId }) => {
    socket.in(roomId).emit("language_change", { languageId });
  });

  // Listen for file events and broadcast to room
  socket.on("file_create", ({ roomId, file }) => {
    socket.in(roomId).emit("file_create", { file });
  });

  socket.on("file_delete", ({ roomId, fileId }) => {
    socket.in(roomId).emit("file_delete", { fileId });
  });

  socket.on("file_switch", ({ roomId, fileId }) => {
    socket.in(roomId).emit("file_switch", { fileId });
  });

  // chat message broadcast
  socket.on("send_message", ({ roomId, message, username }) => {
    io.to(roomId).emit("receive_message", { message, username });
  });

  // Sync code to newly joined user
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle disconnecting users
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];

    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];

    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
