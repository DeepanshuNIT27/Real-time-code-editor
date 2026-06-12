const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions.cjs");
const { StreamClient } = require("@stream-io/node-sdk");
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// 🟢 FIX: Modern Modular Imports for Firebase Admin
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// 🟢 FIX: Safe Initialization Check
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
    }),
  });
}

const server = http.createServer(app);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetOTP: { type: String, default: null },
  resetOTPExpires: { type: Date, default: null },
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

app.post("/api/auth/google", async (req, res) => {
  try {
    const { email, username } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword =
        Math.random().toString(36).slice(-8) + Date.now().toString(36);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        username: username || "Google User",
        email,
        password: hashedPassword,
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      token,
      username: user.username,
      message: "Google Login successful",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during Google login" });
  }
});

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    try {
      // 🟢 FIX: Used getAuth() here for Firebase modular setup
      const decodedToken = await getAuth().verifyIdToken(token);

      let user = await User.findOne({ email: decodedToken.email });

      if (!user) {
        const randomPassword = Math.random().toString(36).slice(-8);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        user = new User({
          username: decodedToken.name || decodedToken.email.split("@")[0],
          email: decodedToken.email,
          password: hashedPassword,
        });
        await user.save();
      }

      req.user = { id: user._id, username: user.username };
      return next();
    } catch (firebaseErr) {
      console.error("Token Auth Error:", firebaseErr);
      return res.status(403).json({ error: "Invalid token" });
    }
  }
};

app.post("/api/auth/sync-user", authenticateToken, async (req, res) => {
  return res.status(200).json({
    success: true,
  });
});

app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Server error during password change" });
  }
});

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

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

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
