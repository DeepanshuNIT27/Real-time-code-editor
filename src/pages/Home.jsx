import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState("");
  // 🟢 NAYA: State initialize karte waqt hi localStorage se naam utha liya
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success("Created a new room");
  };

  const joinRoom = () => {
    const safeRoomId = roomId.trim();
    const safeUsername = username.trim();

    if (!safeRoomId || !safeUsername) {
      toast.error("Room ID & username is required");
      return;
    }

    // redirect
    navigate(`/editor/${safeRoomId}`, {
      state: {
        username: safeUsername,
      },
    });
  };

  const handleInputEnter = (e) => {
    if (e.key === "Enter") {
      joinRoom();
    }
  };

  // 🟢 NAYA: Logout function banaya
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    toast.success("Logged out successfully");
    navigate("/"); // Wapas login page par bhej diya
  };

  return (
    <div className="homePageWrapper">
      {/* 🟢 NAYA: Logout Button (Top-Right Corner) */}
      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "10px 20px",
          backgroundColor: "#ef4444", // Red button
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "14px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          transition: "background 0.3s",
        }}
      >
        Logout
      </button>

      <div className="formWrapper">
        <img
          className="homePageLogo"
          src="/code-sync.png"
          alt="code-sync-logo"
        />

        <h4 className="mainLabel">Paste invitation ROOM ID</h4>

        <div className="inputGroup">
          <input
            type="text"
            className="inputBox"
            placeholder="ROOM ID"
            onChange={(e) => setRoomId(e.target.value)}
            value={roomId}
            onKeyUp={handleInputEnter}
          />

          <input
            type="text"
            className="inputBox"
            placeholder="USER NAME"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
            onKeyUp={handleInputEnter}
          />

          <button className="btn joinBtn" onClick={joinRoom}>
            Join
          </button>

          <span className="createInfo">
            If you don't have an invite then create&nbsp;
            <a href="#" onClick={createNewRoom} className="createNewBtn">
              new room
            </a>
          </span>
        </div>
      </div>

      <footer>
        <h4>
          Built with 💛 by &nbsp;
          <a href="https://github.com/DeepanshuNIT27">Deepanshu Sahu</a>
        </h4>
      </footer>
    </div>
  );
};

export default Home;
