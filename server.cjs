const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions.cjs");
const { StreamClient } = require("@stream-io/node-sdk");
require("dotenv").config();

// 🟢 Database, Auth aur Mail ke liye imports
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer"); // 🟢 ADDED: Nodemailer import

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

// 🟢 User Schema Updated with Room History, isSaved flag, Files array, and OTP fields
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetOTP: { type: String, default: null }, // 🟢 NEW: Password reset OTP store karne ke liye
  resetOTPExpires: { type: Date, default: null }, // 🟢 NEW: OTP expiry time ke liye
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

// ==========================================
// 🟢 Nodemailer Transporter & OTP Function
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPWithEmail = async (userEmail, otp, type) => {
  let subject = "";
  let messageText = "";

  if (type === "signup") {
    subject = "Verify your CodeSync Account";
    messageText = `Welcome to CodeSync! Your verification OTP is: ${otp}. This OTP is valid for 10 minutes.`;
  } else if (type === "forgot") {
    subject = "Reset your CodeSync Password";
    messageText = `You requested a password reset. Your OTP is: ${otp}. Do not share this OTP with anyone.`;
  }

  const mailOptions = {
    from: `"CodeSync Team" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: subject,
    text: messageText,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
};
// ==========================================

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

// 🟢 Signup API
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res
      .status(201)
      .json({ token, username, message: "User created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup" });
  }
});

// 🟢 Login API
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    res
      .status(200)
      .json({ token, username: user.username, message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ==========================================
// 🟢 NEW ENDPOINT: Forgot Password (Send OTP)
// ==========================================
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ error: "User with this email does not exist" });

    // 6-digit random OTP generation
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiry time set kiya 10 minutes ka
    const expiryTime = Date.now() + 10 * 60 * 1000;

    user.resetOTP = otp;
    user.resetOTPExpires = expiryTime;
    await user.save();

    const emailRes = await sendOTPWithEmail(email, otp, "forgot");

    if (emailRes.success) {
      res.status(200).json({ message: "OTP sent successfully to your email" });
    } else {
      res.status(500).json({ error: "Failed to send email OTP" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during forgot-password" });
  }
});

// ==========================================
// 🟢 NEW ENDPOINT: Reset Password (Verify OTP & Update)
// ==========================================
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check agar OTP sahi hai ya expire toh nahi hua
    if (!user.resetOTP || user.resetOTP !== otp) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (Date.now() > user.resetOTPExpires) {
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one" });
    }

    // Naya password hash karke update karo
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOTP = null; // Use karne ke baad clear kardo
    user.resetOTPExpires = null;
    await user.save();

    res
      .status(200)
      .json({ message: "Password updated successfully. You can login now!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error during reset-password" });
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

      // Forcefully update files
      if (files && files.length > 0) {
        user.rooms[existingRoomIndex].files = files;
      }

      // 🟢 STRICT CHECK: Jab Save dabaya jaye tabhi true set ho
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

    // 🔴 BRAHMASTRA: Iske bina Mongoose nested array save nahi karega
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

    // 🟢 STRICT CHECK: Sirf unhi rooms ko filter karega jo actively save kiye gaye the
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

    // Yahan bhi zarurat pad sakti hai agar array length badal rahi ho
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

// --- 👇 SOCKETS CODE (Untouched) 👇 ---
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

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
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
