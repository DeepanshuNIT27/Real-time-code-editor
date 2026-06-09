import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );

  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success("Created a new room. You can now join!");
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    toast.success("Logged out successfully");
    navigate("/");
  };

  // Dummy Data for Previous Rooms (Image ke hisaab se)
  const previousRooms = [
    {
      id: 1,
      name: "DSA Study Group",
      members: 4,
      time: "Updated 2 hours ago",
      color: "#10b981",
    },
    {
      id: 2,
      name: "Web Dev Discussion",
      members: 3,
      time: "Updated yesterday",
      color: "#8b5cf6",
    },
    {
      id: 3,
      name: "CP Practice Room",
      members: 5,
      time: "Updated 2 days ago",
      color: "#f59e0b",
    },
    {
      id: 4,
      name: "React Project Collab",
      members: 2,
      time: "Updated 3 days ago",
      color: "#3b82f6",
    },
  ];

  return (
    <div className="dash-container">
      {/* 🟢 LEFT SIDEBAR */}
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <img src="/code-sync.png" alt="logo" className="dash-logo" />
          <div>
            <h2 className="dash-brand-name">CodeSync</h2>
            <p className="dash-brand-tag">Realtime Collaboration</p>
          </div>
        </div>

        <nav className="dash-nav">
          <button className="dash-nav-item active">🏠 Home</button>
          <button className="dash-nav-item">👥 My Rooms</button>
          <button className="dash-nav-item">⚙️ Settings</button>
        </nav>

        <div className="dash-profile">
          <div className="dash-avatar">
            <img
              src={`https://ui-avatars.com/api/?name=${username || "User"}&background=random`}
              alt="User"
            />
          </div>
          <div className="dash-user-info">
            <span className="dash-user-name">{username || "Guest"}</span>
            <span className="dash-user-email">Logged in</span>
          </div>
        </div>
      </aside>

      {/* 🟢 RIGHT MAIN CONTENT */}
      <main className="dash-main">
        {/* HEADER */}
        <header className="dash-header">
          <div>
            <h1>Welcome back, {username || "Developer"}! 👋</h1>
            <p>Let's code something amazing today.</p>
          </div>
          <div className="dash-header-actions">
            <button className="dash-theme-btn">☀️ 🌙</button>
            <button className="dash-logout-btn" onClick={handleLogout}>
              Logout 🚪
            </button>
          </div>
        </header>

        {/* PREVIOUS ROOMS GRID */}
        <section className="dash-section">
          <div className="dash-section-title">
            <h3>Previous Rooms</h3>
            <span className="dash-view-all">View all rooms →</span>
          </div>
          <div className="dash-rooms-grid">
            {previousRooms.map((room) => (
              <div className="dash-room-card" key={room.id}>
                <div
                  className="dash-room-icon"
                  style={{
                    backgroundColor: `${room.color}20`,
                    color: room.color,
                  }}
                >
                  &lt;/&gt;
                </div>
                <h4>{room.name}</h4>
                <p className="dash-room-members">👥 {room.members} members</p>
                <div className="dash-room-footer">
                  <span>{room.time}</span>
                  <div
                    className="dash-status-dot"
                    style={{ backgroundColor: room.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ACTION CARDS (Create & Join) */}
        <section className="dash-action-container">
          {/* CREATE CARD */}
          <div className="dash-action-card">
            <h3>Start a New Room</h3>
            <p className="dash-card-desc">
              Create a new room and invite your friends
            </p>
            <div className="dash-illustration">
              <div className="dash-mock-window">
                <div
                  className="dash-line"
                  style={{ width: "40%", background: "#3b82f6" }}
                ></div>
                <div
                  className="dash-line"
                  style={{ width: "70%", background: "#10b981" }}
                ></div>
                <div
                  className="dash-line"
                  style={{ width: "50%", background: "#f59e0b" }}
                ></div>
              </div>
            </div>
            <button className="dash-btn-primary" onClick={createNewRoom}>
              + Create New Room
            </button>
          </div>

          {/* JOIN CARD */}
          <div className="dash-action-card">
            <h3>Join Existing Room</h3>
            <p className="dash-card-desc">
              Enter a room ID to join an ongoing session
            </p>
            <div className="dash-illustration">
              <div className="dash-join-mock">
                <span>🧑‍💻</span> ↔️ <span>&lt;/&gt;</span> ↔️ <span>👩‍💻</span>
              </div>
            </div>
            <div className="dash-join-input-group">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyUp={handleInputEnter}
                className="dash-input"
              />
              <button className="dash-btn-secondary" onClick={joinRoom}>
                Join Room
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="dash-footer">
          Built with ❤️ by{" "}
          <a href="https://github.com/DeepanshuNIT27">Deepanshu Sahu</a>
        </footer>
      </main>
    </div>
  );
};

export default Home;
