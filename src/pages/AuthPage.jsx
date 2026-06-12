import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// 🟢 NEW: Firebase imports added and updated here
import { auth, googleProvider } from "../firebase";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // 🟢 FORGOT PASSWORD STATE
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);

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

  const headlines = ["Build Faster.", "Ship Better."];
  const [headlineIndex, setHeadlineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % headlines.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const navigate = useNavigate();

  // 🟢 Google Login Handler (SECURED)
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 🔒 Firebase token nikalo
      const firebaseToken = await user.getIdToken();
      const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

      // 🔒 Sirf headers me token bhejo, spoofing impossible
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        toast.success("Google Login successful!");
        navigate("/home");
      } else {
        toast.error(data.error || "Google login failed");
      }
    } catch (error) {
      console.error("Google Auth error:", error);
      toast.error("Google login cancelled or failed");
    }
  };

  // 🟢 Normal Login/Signup Handler (SECURED)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading(
      isLogin ? "Signing in..." : "Creating account...",
    );

    const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;

        // Check if email is verified
        if (!user.emailVerified) {
          await signOut(auth);
          toast.error("Please verify your email before logging in!", {
            id: toastId,
          });
          return;
        }

        // 🔒 Firebase token nikalo
        const firebaseToken = await user.getIdToken();

        // 🔒 Backend sync with secure headers
        const response = await fetch(`${API_BASE_URL}/api/auth/firebase-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firebaseToken}`,
          },
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem("token", data.token); // Custom Backend JWT stored
          localStorage.setItem("username", data.username);
          toast.success("Logged in successfully!", { id: toastId });
          navigate("/home");
        } else {
          toast.error(data.error || "Backend sync failed", { id: toastId });
        }
      } else {
        // Firebase Sign Up
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;

        await sendEmailVerification(user);
        await signOut(auth);

        toast.success(
          "Verification email sent! Please check your inbox and verify before logging in. 🚀",
          { id: toastId, duration: 5000 },
        );

        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      console.error("Firebase Auth error:", error);
      let errorMessage = "Authentication failed";
      if (error.code === "auth/email-already-in-use")
        errorMessage = "Email already exists! Please Login.";
      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential"
      )
        errorMessage = "Invalid email or password!";
      if (error.code === "auth/weak-password")
        errorMessage = "Password should be at least 6 characters!";

      toast.error(errorMessage, { id: toastId });
    }
  };

  // 🟢 Firebase Password Reset Handler
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email first");

    const toastId = toast.loading("Sending reset link...");

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset link sent to your email! 🚀", {
        id: toastId,
      });

      setIsForgotPasswordMode(false);
      setEmail("");
    } catch (error) {
      console.error("Reset error:", error);
      let errorMessage = "Failed to send link";
      if (error.code === "auth/user-not-found")
        errorMessage = "No account found with this email!";
      if (error.code === "auth/invalid-email")
        errorMessage = "Invalid email format!";

      toast.error(errorMessage, { id: toastId });
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
          {isForgotPasswordMode ? (
            <>
              <h2 style={styles.cardTitle}>Reset Password</h2>
              <p style={styles.cardSubtitle}>
                Enter your registered email to get a reset link
              </p>

              <form onSubmit={handleForgotPassword} style={styles.form}>
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
                  Send Reset Link
                </button>
              </form>

              <p style={styles.switchPrompt}>
                Remember your password?{" "}
                <span
                  onClick={() => setIsForgotPasswordMode(false)}
                  style={styles.switchLink}
                >
                  Back to Login
                </span>
              </p>
            </>
          ) : (
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

              <button
                type="button"
                style={styles.googleBtn}
                onClick={handleGoogleLogin}
              >
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  style={styles.googleIcon}
                />
                Continue with Google
              </button>

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
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "20px",
    marginBottom: "20px",
    transition: "all 0.3s ease",
  },
  googleIcon: {
    width: "20px",
    height: "20px",
    marginRight: "10px",
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
