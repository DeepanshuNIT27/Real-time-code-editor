const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions.cjs");
const { StreamClient } = require("@stream-io/node-sdk");
require("dotenv").config();

// 🟢 Database aur Auth ke liye imports
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin"); // 🔒 ADDED: Firebase Admin SDK for verification

// 🔒 Firebase Admin Setup
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace \\n in the env variable to proper line breaks
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
    }),
  });
}

const server = http.createServer(app);

// CORS fix for production
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());

// 🟢 MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// 🟢 User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rooms: [
    {
      roomId: String,
      name: String,
      color: String,
      lastAccessed: { type: Date, default: Date.now },
      isSaved: { type: Boolean, default: false },
      files: [
        {
          id: String,
          name: String,
          language: String,
          content: String,
        },
      ],
    },
  ],
});
const User = mongoose.model("User", userSchema);

const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ["GET", "POST"] },
});
app.use(express.static(path.join(__dirname, "dist")));

// (Video token route)
app.post("/api/video/token", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });
    const apiKey = process.env.STREAM_API_KEY;
    const apiSecret = process.env.STREAM_API_SECRET;
    if (!apiKey || !apiSecret)
      return res.status(500).json({ error: "Stream credentials missing" });
    const serverClient = new StreamClient(apiKey, apiSecret);
    const token = serverClient.createCallToken({
      user_id: userId,
      validity_in_seconds: 3600,
    });
    return res.status(200).json({ token, apiKey });
  } catch (error) {
    console.error("Video token generation error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==========================================
// 🔒 SECURE ENDPOINT: Firebase Sync (Google + Email/Password dono ke liye)
// ==========================================
app.post("/api/auth/firebase-sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if Bearer token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or invalid Firebase token" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the token using Firebase Admin SDK (Spoofing Impossible now!)
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    const email = decodedToken.email;
    const username = decodedToken.name || email.split("@")[0];

    let user = await User.findOne({ email });

    if (!user) {
      // Create MongoDB profile if logging in for the first time
      const randomPassword =
        Math.random().toString(36).slice(-8) + Date.now().toString(36);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        username: username,
        email,
        password: hashedPassword,
      });
      await user.save();
    }

    // Generate custom backend JWT token using process.env.JWT_SECRET
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token,
      username: user.username,
      message: "Backend sync successful",
    });
  } catch (err) {
    console.error("Firebase Token Verification Error:", err);
    res.status(403).json({ error: "Invalid Firebase token or server error" });
  }
});
// ==========================================

// 🟢 Token Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// 🟢 Save/Update Room in History
app.post("/api/rooms/save", authenticateToken, async (req, res) => {
  try {
    const { roomId, name, color, files, isSaved } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existingRoomIndex = user.rooms.findIndex((r) => r.roomId === roomId);
    if (existingRoomIndex !== -1) {
      user.rooms[existingRoomIndex].lastAccessed = Date.now();

      if (files && files.length > 0) {
        user.rooms[existingRoomIndex].files = files;
      }

      if (isSaved === true) {
        user.rooms[existingRoomIndex].isSaved = true;
      }
    } else {
      user.rooms.push({
        roomId,
        name: name || "Collab Room",
        color: color || "#3b82f6",
        files: files || [],
        isSaved: isSaved === true ? true : false,
      });
    }

    user.markModified("rooms");

    await user.save();
    res.status(200).json({ message: "Room saved", rooms: user.rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🟢 Fetch Room History
app.get("/api/rooms/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const savedRooms = user.rooms.filter((r) => r.isSaved === true);

    const sortedRooms = savedRooms.sort(
      (a, b) => b.lastAccessed - a.lastAccessed,
    );
    res.status(200).json({ rooms: sortedRooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// 🟢 Delete Room from History API
app.delete("/api/rooms/:roomId", authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.rooms = user.rooms.filter((r) => r.roomId !== roomId);

    user.markModified("rooms");

    await user.save();

    res.status(200).json({ message: "Room deleted", rooms: user.rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during deletion" });
  }
});

// ⚠️ Catch-all route
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// --- 👇 SOCKETS CODE 👇 ---
const userSocketMap = {};
function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => ({
      socketId,
      username: userSocketMap[socketId],
    }),
  );
}

io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { fileId, code });
  });

  socket.on("file_create", ({ roomId, file }) => {
    socket.in(roomId).emit("file_create", { file });
  });

  socket.on("file_delete", ({ roomId, fileId }) => {
    socket.in(roomId).emit("file_delete", { fileId });
  });

  socket.on("file_switch", ({ roomId, fileId }) => {
    socket.in(roomId).emit("file_switch", { fileId });
  });

  socket.on("panel_switch", ({ roomId, panel }) => {
    socket.in(roomId).emit("panel_switch", { panel });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, files, activeFileId }) => {
    io.to(socketId).emit("sync_workspace", { code, files, activeFileId });
  });

  socket.on("whiteboard_draw", ({ roomId, delta }) => {
    socket.in(roomId).emit("whiteboard_draw_remote", { delta });
  });

  socket.on("send_message", ({ roomId, message, username }) => {
    io.in(roomId).emit("receive_message", { message, username });
  });

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
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
