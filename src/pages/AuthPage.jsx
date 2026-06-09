import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // 🟢 NAYA: Errors/Success dikhane ke liye

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  // 🟢 NAYA: Form inputs ka data store karne ke liye states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check kar rahe hain ki Login par hit marna hai ya Signup par
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";

    // Jo data backend ko bhejna hai
    const payload = isLogin
      ? { email, password }
      : { username: name, email, password };

    try {
      // 🟢 NAYA: Backend API Call (localhost:5000 par)
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Success: Token save karo aur Home par bhejo
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username); // username bhi save kar liya (aage kaam aayega)

        toast.success(isLogin ? "Logged in successfully!" : "Account created!");
        navigate("/home");
      } else {
        // ❌ Error: Backend ne koi error diya (e.g., Wrong password)
        toast.error(data.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Server error! Backend chalu hai ya nahi check karo.");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "#1e293b",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#fff", marginBottom: "10px", fontSize: "28px" }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "30px", fontSize: "14px" }}>
          {isLogin
            ? "Sign in to access your workspace"
            : "Sign up to start collaborating"}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {!isLogin && (
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)} // State connect ki
              required
              style={{
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                backgroundColor: "#0f172a",
                color: "#fff",
                outline: "none",
              }}
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)} // State connect ki
            required
            style={{
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #334155",
              backgroundColor: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // State connect ki
            required
            style={{
              padding: "14px",
              borderRadius: "8px",
              border: "1px solid #334155",
              backgroundColor: "#0f172a",
              color: "#fff",
              outline: "none",
            }}
          />

          <button
            type="submit"
            style={{
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#3b82f6",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {/* ❌ GUEST MODE BUTTON AUR DIVIDER YAHAN SE HAMESHA KE LIYE UDA DIYA HAI ❌ */}

        <p style={{ color: "#94a3b8", marginTop: "25px", fontSize: "14px" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}
          >
            {isLogin ? "Sign Up" : "Log In"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
