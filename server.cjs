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

// 🟢 NEW SCHEMA: Sign-Up Verification se pehle temporary user data store karne ke liye
const tempUserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true },
});
const TempUser = mongoose.model("TempUser", tempUserSchema);

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

// 🟢 Signup API (UPDATED: Bhejegha OTP, Data temporary store karega)
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check karo permanent DB me user pehle se toh nahi hai
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. OTP aur Expiry Time (10 mins) generate karo
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Date.now() + 10 * 60 * 1000;

    // 3. Purana koi adhoora signup data pada ho toh clear kardo
    await TempUser.deleteOne({ email });

    // 4. Temporary collection me data save karo
    const tempUser = new TempUser({
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires: expiryTime,
    });
    await tempUser.save();

    // 5. Email send karo
    const emailRes = await sendOTPWithEmail(email, otp, "signup");

    if (emailRes.success) {
      res.status(200).json({ message: "Verification OTP sent to your email!" });
    } else {
      res.status(500).json({ error: "Failed to send verification email" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error during signup request" });
  }
});

// ==========================================
// 🟢 NEW ENDPOINT: Verify SignUp OTP & Create Account
// ==========================================
app.post("/api/auth/verify-signup", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const tempUser = await TempUser.findOne({ email });

    if (!tempUser) {
      return res
        .status(404)
        .json({ error: "Signup session expired. Please register again." });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (Date.now() > tempUser.otpExpires) {
      return res
        .status(400)
        .json({ error: "OTP has expired. Please sign up again." });
    }

    // OTP Sahi hai -> Move data to permanent User Collection
    const newUser = new User({
      username: tempUser.username,
      email: tempUser.email,
      password: tempUser.password, // Pehle se hashed hai
    });
    await newUser.save();

    // Temporary data clear karo
    await TempUser.deleteOne({ email });

    // JWT token generate karke sidha login state do
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      token,
      username: newUser.username,
      message: "Account verified and created successfully!",
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Server error during registration verification" });
  }
});
// ==========================================

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
// 🟢 NEW ENDPOINT: Google Login/Signup
// ==========================================
app.post("/api/auth/google", async (req, res) => {
  try {
    const { email, username } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      // Agar user naya hai toh ek random secure password dekar account bana denge
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

    // Purana user ho ya naya, standard JWT token generate karke bhej do
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
// ==========================================

// 🟢 NEW ENDPOINT: Forgot Password (Send OTP)
app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ error: "User with this email does not exist" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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

// 🟢 NEW ENDPOINT: Reset Password (Verify OTP & Update)
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.resetOTP || user.resetOTP !== otp) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    if (Date.now() > user.resetOTPExpires) {
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOTP = null;
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

// ==========================================
// 🟢 NEW ENDPOINT: Change Password (Logged-in Users)
// ==========================================
app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // authenticateToken middleware se aayega

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Purana password check karo
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect current password" });
    }

    // Naya password hash karke save karo
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
// ==========================================

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
