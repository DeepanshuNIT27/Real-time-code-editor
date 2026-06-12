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

// 🔒 MODULAR FIREBASE ADMIN SETUP (Crash-Proof)
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

// ==========================================
// 🛡️ CRITICAL GUARDS: Fail-Fast Check for ENV
// ==========================================
if (!process.env.MONGO_URI) {
  console.error("🚨 FATAL ERROR: MONGO_URI missing.");
  process.exit(1);
}

// Firebase Admin Setup
try {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(
          /\\n/g,
          "\n",
        ),
      }),
    });
    console.log("✅ Firebase Admin Initialized");
  }
} catch (error) {
  console.error("❌ Firebase Admin Error:", error.message);
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
      files: [{ id: String, name: String, language: String, content: String }],
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
    if (!userId) return res.status(400).json({ error: "User ID required" });
    const serverClient = new StreamClient(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET,
    );
    const token = serverClient.createCallToken({
      user_id: userId,
      validity_in_seconds: 3600,
    });
    return res.status(200).json({ token, apiKey: process.env.STREAM_API_KEY });
  } catch (error) {
    console.error("Video token error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// ==========================================
// 🔒 SECURE ENDPOINT: Firebase Sync
// ==========================================
app.post("/api/auth/firebase-sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const email = decodedToken.email;
    const username = decodedToken.name || email.split("@")[0];

    let user = await User.findOne({ email });
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("google-auth-placeholder", salt);
      user = new User({ username, email, password: hashedPassword });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.status(200).json({ token, username: user.username });
  } catch (err) {
    console.error("Auth sync error:", err);
    res.status(403).json({ error: "Invalid token" });
  }
});

// 🟢 Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// 🟢 Room APIs (History/Save/Delete - Logic Unchanged)
app.post("/api/rooms/save", authenticateToken, async (req, res) => {
  const { roomId, name, color, files, isSaved } = req.body;
  const user = await User.findById(req.user.id);
  const idx = user.rooms.findIndex((r) => r.roomId === roomId);
  if (idx !== -1) {
    user.rooms[idx].lastAccessed = Date.now();
    if (files) user.rooms[idx].files = files;
    if (isSaved) user.rooms[idx].isSaved = true;
  } else {
    user.rooms.push({ roomId, name, color, files, isSaved });
  }
  await user.save();
  res.status(200).json({ rooms: user.rooms });
});

app.get("/api/rooms/history", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ rooms: user.rooms.filter((r) => r.isSaved) });
});

app.delete("/api/rooms/:roomId", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.rooms = user.rooms.filter((r) => r.roomId !== req.params.roomId);
  await user.save();
  res.status(200).json({ rooms: user.rooms });
});

app.use((req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

// --- Sockets (Unchanged) ---
io.on("connection", (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    socket.join(roomId);
  });
  // ... socket events remain exactly same as before ...
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, fileId, code }) =>
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { fileId, code }),
  );
  socket.on("whiteboard_draw", ({ roomId, delta }) =>
    socket.in(roomId).emit("whiteboard_draw_remote", { delta }),
  );
  // ... add all your previous socket events here ...
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => console.log(`Listening on port ${PORT}`));
