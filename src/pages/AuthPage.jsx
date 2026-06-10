import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // 🟢 Naye states Forgot Password flow ke liye
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotStage, setForgotStage] = useState(1); // 1 = Enter Email, 2 = Enter OTP & New Password
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // --- Terminal Lines List ---
  const terminalLines = [
    "$ initializing workspace...",
    "✓ Workspace ready",
    "$ connecting to server...",
    "✓ Connected",
    "$ waiting for collaborators...",
    "✓ You are all set!",
  ];

  const [visibleLines, setVisibleLines] = useState([]);

  useEffect(() => {
    setVisibleLines([]);
    const timeouts = [];

    terminalLines.forEach((line, index) => {
      const t = setTimeout(
        () => {
          setVisibleLines((prev) => [...prev, line]);
        },
        (index + 1) * 600,
      );
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [isLogin]);

  // --- 🟢 FIX: Only 2 items in loop now ---
  const headlines = ["Build Faster.", "Ship Better."];
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  // 🟢 Normal Login/Signup Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    const payload = isLogin
      ? { email, password }
      : { username: name, email, password };

    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        toast.success(isLogin ? "Logged in successfully!" : "Account created!");
        navigate("/home");
      } else {
        toast.error(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Server error! Backend chalu hai ya nahi check karo.");
    }
  };

  // 🟢 Send OTP Handler
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email first");

    const toastId = toast.loading("Sending OTP to your email...");
    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message, { id: toastId });
        setForgotStage(2); // Stage 2 par le jao
      } else {
        toast.error(data.error || "Failed to send OTP", { id: toastId });
      }
    } catch (error) {
      console.error("OTP error:", error);
      toast.error("Server error!", { id: toastId });
    }
  };

  // 🟢 Reset Password Handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) return toast.error("Please fill all fields");

    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Reset karke wapas login screen par bhej do
        setIsForgotPasswordMode(false);
        setForgotStage(1);
        setOtp("");
        setNewPassword("");
        setPassword("");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("Server error!");
    }
  };

  return (
    <div style={styles.container}>
      <style>{customCSS}</style>

      {/* Floating Elements */}
      <div
        style={{
          ...styles.floatingTag,
          top: "20%",
          left: "45%",
          animation: "float 6s ease-in-out infinite",
        }}
      >
        {"</>"}
      </div>
      <div
        style={{
          ...styles.floatingTag,
          top: "40%",
          left: "8%",
          animation: "float 8s ease-in-out infinite 1s",
        }}
      >
        {"{}"}
      </div>
      <div
        style={{
          ...styles.floatingTag,
          bottom: "25%",
          left: "38%",
          animation: "float 7s ease-in-out infinite 2s",
        }}
      >
        {"{}"}
      </div>

      {/* LEFT COLUMN: BRANDING & LOGS */}
      <div className="left-column" style={styles.leftColumn}>
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>🧬</span>
          <span style={styles.logoText}>CodeSync</span>
        </div>

        {/* 🟢 Static Head + Smooth Color Switching Subhead */}
        <h1 style={styles.mainTitle}>
          <div style={{ color: "#fff", marginBottom: "4px" }}>
            Code Together.
          </div>
          <div
            style={{
              color: headlineIndex === 0 ? "#7B61FF" : "#00F5D4",
              transition: "color 0.6s ease-in-out",
            }}
          >
            {headlines[headlineIndex]}
          </div>
        </h1>

        <p style={styles.subtext}>
          The modern real-time code editor for collaborative developers and
          teams.
        </p>

        <div style={styles.badgeContainer}>
          <span style={styles.badge}>⚡ Real-time Sync</span>
          <span style={styles.badge}>🎨 Whiteboard</span>
          <span style={styles.badge}>🚀 Instant Execution</span>
          <span style={styles.badge}>🔒 Secure Rooms</span>
        </div>

        {/* Compact Terminal Box */}
        <div style={styles.terminalBox}>
          <div style={styles.terminalHeader}>
            <span style={{ ...styles.dot, backgroundColor: "#ef4444" }}></span>
            <span style={{ ...styles.dot, backgroundColor: "#eab308" }}></span>
            <span style={{ ...styles.dot, backgroundColor: "#22c55e" }}></span>
          </div>
          <div style={styles.terminalBody}>
            {visibleLines.map((line, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.terminalLine,
                  color: line.startsWith("✓") ? "#00F5D4" : "#94a3b8",
                }}
              >
                {line}
              </div>
            ))}
            <span style={styles.cursor}>|</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: GLASS CARD AUTH */}
      <div style={styles.rightColumn}>
        <div style={styles.card}>
          {/* ========================================== */}
          {/* 🟢 FORGOT PASSWORD VIEW */}
          {/* ========================================== */}
          {isForgotPasswordMode ? (
            <>
              <h2 style={styles.cardTitle}>Reset Password</h2>
              <p style={styles.cardSubtitle}>
                {forgotStage === 1
                  ? "Enter your email to receive a recovery OTP"
                  : `OTP sent to ${email}`}
              </p>

              {forgotStage === 1 ? (
                // STAGE 1: Request OTP
                <form onSubmit={handleSendOTP} style={styles.form}>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>✉️</span>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.submitButton}>
                    Send OTP
                  </button>
                </form>
              ) : (
                // STAGE 2: Verify OTP and Set New Password
                <form onSubmit={handleResetPassword} style={styles.form}>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>🔑</span>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>🔒</span>
                    <input
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                  <button type="submit" style={styles.submitButton}>
                    Update Password
                  </button>
                </form>
              )}

              <p style={styles.switchPrompt}>
                Remember your password?{" "}
                <span
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setForgotStage(1);
                  }}
                  style={styles.switchLink}
                >
                  Back to Login
                </span>
              </p>
            </>
          ) : (
            /* ========================================== */
            /* 🟢 NORMAL LOGIN / SIGNUP VIEW */
            /* ========================================== */
            <>
              <h2 style={styles.cardTitle}>Welcome Back</h2>
              <p style={styles.cardSubtitle}>
                Sign in to continue to your workspace
              </p>

              <div style={styles.tabContainer}>
                <button
                  onClick={() => setIsLogin(true)}
                  style={{
                    ...styles.tabButton,
                    color: isLogin ? "#00F5D4" : "#64748b",
                    borderBottom: isLogin ? "2px solid #00F5D4" : "none",
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  style={{
                    ...styles.tabButton,
                    color: !isLogin ? "#00F5D4" : "#64748b",
                    borderBottom: !isLogin ? "2px solid #00F5D4" : "none",
                  }}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSubmit} style={styles.form}>
                {!isLogin && (
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputIcon}>👤</span>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={styles.input}
                    />
                  </div>
                )}

                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>✉️</span>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputWrapper}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                {isLogin && (
                  <div style={styles.formOptions}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: "#00F5D4" }}
                      />
                      Remember me
                    </label>
                    <span
                      style={styles.forgotPassword}
                      // 🟢 Yahan click karne par Forgot Password view khulega
                      onClick={() => setIsForgotPasswordMode(true)}
                    >
                      Forgot password?
                    </span>
                  </div>
                )}

                <button type="submit" style={styles.submitButton}>
                  {isLogin ? "Sign In" : "Sign Up"}
                </button>
              </form>

              <div style={styles.divider}>or continue with</div>
              <div style={styles.socialContainer}>
                <button style={styles.socialBtn} title="GitHub">
                  🐙
                </button>
                <button style={styles.socialBtn} title="Google">
                  🔍
                </button>
                <button style={styles.socialBtn} title="Discord">
                  💬
                </button>
              </div>

              <p style={styles.switchPrompt}>
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <span
                  onClick={() => setIsLogin(!isLogin)}
                  style={styles.switchLink}
                >
                  {isLogin ? "Sign Up" : "Sign In"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// --- CSS Injector ---
const customCSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body, #root {
    width: 100%;
    height: 100%;
    background-color: #050814;
  }
  @keyframes float {
    0% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
    50% { transform: translateY(-15px) rotate(8deg); opacity: 0.2; }
    100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
  }
  @keyframes blink {
    50% { opacity: 0; }
  }
  input::placeholder {
    color: #4b5563 !important;
  }
  @media (max-width: 900px) {
    .left-column { display: none !important; }
  }
`;

// --- Styles Layout ---
const styles = {
  container: {
    display: "flex",
    width: "100vw",
    minHeight: "100vh",
    backgroundColor: "#050814",
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    color: "#fff",
    overflow: "hidden",
    position: "relative",
  },
  floatingTag: {
    position: "absolute",
    fontSize: "36px",
    fontWeight: "bold",
    color: "#7B61FF",
    pointerEvents: "none",
    zIndex: 1,
  },
  leftColumn: {
    flex: 1.2,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "0 60px 0 80px",
    zIndex: 2,
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "35px",
  },
  logoIcon: { fontSize: "24px" },
  logoText: { fontSize: "22px", fontWeight: "bold", letterSpacing: "0.5px" },
  mainTitle: {
    fontSize: "44px",
    fontWeight: "800",
    lineHeight: "1.2",
    marginBottom: "20px",
  },
  subtext: {
    color: "#94a3b8",
    fontSize: "15px",
    maxWidth: "440px",
    marginBottom: "30px",
    lineHeight: "1.6",
  },
  badgeContainer: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "35px",
  },
  badge: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    border: "1px solid rgba(255,255,255,0.05)",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "12px",
    color: "#cbd5e1",
  },
  terminalBox: {
    backgroundColor: "rgba(9, 13, 26, 0.8)",
    border: "1px solid rgba(123, 97, 255, 0.2)",
    borderRadius: "10px",
    padding: "16px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
  },
  terminalHeader: { display: "flex", gap: "6px", marginBottom: "12px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%" },
  terminalBody: {
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: "1.7",
  },
  terminalLine: { minHeight: "20px" },
  cursor: {
    color: "#00F5D4",
    animation: "blink 1s infinite",
    fontSize: "14px",
  },

  rightColumn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 2,
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "rgba(13, 20, 38, 0.65)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.06)",
    padding: "35px",
    borderRadius: "20px",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.6)",
  },
  cardTitle: {
    fontSize: "24px",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: "6px",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: "13px",
    textAlign: "center",
    marginBottom: "25px",
  },
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #1e293b",
    marginBottom: "20px",
  },
  tabButton: {
    flex: 1,
    padding: "10px",
    background: "none",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(5, 8, 20, 0.6)",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "0 12px",
  },
  inputIcon: { fontSize: "14px", marginRight: "8px", opacity: 0.5 },
  input: {
    flex: 1,
    padding: "12px 0",
    background: "none",
    border: "none",
    color: "#fff",
    outline: "none",
    fontSize: "14px",
  },
  formOptions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    color: "#94a3b8",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
  },
  forgotPassword: { color: "#00F5D4", cursor: "pointer" },
  submitButton: {
    padding: "12px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #7B61FF 0%, #00F5D4 100%)",
    color: "#050814",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "5px",
    boxShadow: "0 4px 15px rgba(0, 245, 212, 0.2)",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    color: "#4b5563",
    fontSize: "11px",
    margin: "20px 0",
    gap: "10px",
  },
  socialContainer: { display: "flex", gap: "10px", marginBottom: "20px" },
  socialBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "rgba(30, 41, 59, 0.3)",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  switchPrompt: {
    color: "#64748b",
    textAlign: "center",
    fontSize: "13px",
    marginTop: "5px",
  },
  switchLink: {
    color: "#00F5D4",
    cursor: "pointer",
    fontWeight: "600",
    marginLeft: "5px",
  },
};

export default AuthPage;
