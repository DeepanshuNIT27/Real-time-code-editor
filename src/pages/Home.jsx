import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [username, setUsername] = useState(
    localStorage.getItem("username") || "",
  );

  const [historyRooms, setHistoryRooms] = useState([]);
  const [activeTab, setActiveTab] = useState("home");

  // 👇 Yahan hum API_BASE_URL define kar rahe hain taaki sab jagah use ho sake
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchHistory = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      // 👇 Localhost hataya
      const res = await fetch(`${API_BASE_URL}/api/rooms/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.rooms) {
        setHistoryRooms(data.rooms);
      }
    } catch (error) {
      console.error("History fetch error:", error);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const createNewRoom = async (e) => {
    e.preventDefault();

    const finalRoomName = roomName.trim();
    if (!finalRoomName) {
      toast.error("Please enter a Room Name to create a new room!");
      return;
    }

    const id = uuidv4();
    setRoomId(id);

    const randomColor = ["#10b981", "#8b5cf6", "#f59e0b", "#3b82f6"][
      Math.floor(Math.random() * 4)
    ];
    const token = localStorage.getItem("token");

    if (token) {
      try {
        // 👇 Undefined 'endpoint' variable hataya aur direct route daala
        await fetch(`${API_BASE_URL}/api/rooms/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId: id,
            name: finalRoomName,
            color: randomColor,
          }),
        });

        await fetchHistory();
        toast.success(`Created room: ${finalRoomName}. You can now join!`);
      } catch (err) {
        console.error("Error saving room:", err);
        toast.error("Failed to save room in history");
      }
    }
    setRoomName("");
  };

  const joinRoom = async () => {
    const safeRoomId = roomId.trim();
    const safeUsername = username.trim();

    if (!safeRoomId || !safeUsername) {
      toast.error("Room ID & username is required");
      return;
    }

    const token = localStorage.getItem("token");
    if (token) {
      try {
        // 👇 Localhost hataya
        await fetch(`${API_BASE_URL}/api/rooms/save`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId: safeRoomId,
            name: "Joined Workspace",
            color: "#3b82f6",
          }),
        });
      } catch (err) {
        console.error("Error saving join history:", err);
      }
    }

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

  const joinFromHistory = (historyRoomId) => {
    if (!username.trim()) {
      toast.error("Please enter a username first to join");
      return;
    }
    navigate(`/editor/${historyRoomId}`, {
      state: { username: username.trim() },
    });
  };

  return (
    <div className="dash-container">
      {/* 🟢 LEFT SIDEBAR (Ab Clickable Hai) */}
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <img src="/code-sync.png" alt="logo" className="dash-logo" />
          <div>
            <h2 className="dash-brand-name">CodeSync</h2>
            <p className="dash-brand-tag">Realtime Collaboration</p>
          </div>
        </div>

        <nav className="dash-nav">
          <button
            className={`dash-nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            🏠 Home
          </button>
          <button
            className={`dash-nav-item ${activeTab === "myRooms" ? "active" : ""}`}
            onClick={() => setActiveTab("myRooms")}
          >
            👥 My Rooms
          </button>
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

      {/* RIGHT MAIN CONTENT */}
      <main className="dash-main">
        {/* 🟢 TABS LOGIC: Agar "home" hai toh dashboard dikhao, warna "myRooms" dikhao */}
        {activeTab === "home" ? (
          <>
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

            {/* PREVIOUS ROOMS GRID (Top 4) */}
            <section className="dash-section">
              <div className="dash-section-title">
                <h3>Your Recent Rooms</h3>
                {/* 🟢 NAYA: View All pe click karne se "myRooms" tab khul jayega */}
                <span
                  className="dash-view-all"
                  onClick={() => setActiveTab("myRooms")}
                >
                  View all rooms →
                </span>
              </div>
              <div className="dash-rooms-grid">
                {historyRooms.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    No previous rooms found. Create or join one below!
                  </p>
                ) : (
                  historyRooms.slice(0, 4).map((room) => (
                    <div
                      className="dash-room-card"
                      key={room._id || room.roomId}
                      onClick={() => joinFromHistory(room.roomId)}
                    >
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
                      <p className="dash-room-members">
                        Room ID: {room.roomId.substring(0, 8)}...
                      </p>
                      <div className="dash-room-footer">
                        <span>
                          {new Date(room.lastAccessed).toLocaleDateString()}
                        </span>
                        <div
                          className="dash-status-dot"
                          style={{ backgroundColor: room.color }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* ACTION CARDS */}
            <section className="dash-action-container">
              {/* CREATE CARD */}
              <div className="dash-action-card">
                <h3>Start a New Room</h3>
                <p className="dash-card-desc">
                  Name your room and generate an invite link
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
                <input
                  type="text"
                  placeholder="Enter Room Name (e.g. My React App)"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="dash-input"
                  style={{ marginBottom: "15px", width: "100%" }}
                />
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
          </>
        ) : (
          // 🟢 YAHAN SE "MY ROOMS" WALA PAGE SHURU HOTA HAI
          <>
            <header className="dash-header">
              <div>
                <h1>My Rooms 📁</h1>
                <p>All your created and joined workspaces in one place.</p>
              </div>
              <div className="dash-header-actions">
                <button className="dash-logout-btn" onClick={handleLogout}>
                  Logout 🚪
                </button>
              </div>
            </header>

            <section className="dash-section">
              <div className="dash-rooms-grid">
                {historyRooms.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>
                    You haven't joined or created any rooms yet.
                  </p>
                ) : (
                  // Yahan saare rooms dikhenge (bina slice kiye)
                  historyRooms.map((room) => (
                    <div
                      className="dash-room-card"
                      key={room._id || room.roomId}
                      onClick={() => joinFromHistory(room.roomId)}
                    >
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
                      <p className="dash-room-members">
                        Room ID: {room.roomId}
                      </p>
                      <div className="dash-room-footer">
                        <span>
                          Last accessed:{" "}
                          {new Date(room.lastAccessed).toLocaleDateString()}
                        </span>
                        <div
                          className="dash-status-dot"
                          style={{ backgroundColor: room.color }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

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
