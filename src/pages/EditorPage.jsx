import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

import ACTIONS from "../Actions.js";
import Client from "../components/Client.jsx";
import Editor from "../components/Editor.jsx";
import Output from "../components/Output.jsx";
import ChatBox from "../components/ChatBox.jsx";
import AIChat from "../components/AIChat.jsx";
import FilePanel from "../components/FilePanel.jsx";
import Whiteboard from "../components/Whiteboard.jsx";
import { initSocket } from "../socket.js";

import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";

// 🎯 Extension to Judge0 Language ID Mapping (Saari 7 Languages)
const extensionToLangMap = {
  cpp: 54, // C++
  py: 71, // Python
  js: 63, // JavaScript
  java: 62, // Java
  c: 50, // C
  go: 60, // Go
  rb: 72, // Ruby
};

const EditorPage = () => {
  // References
  const socketRef = useRef(null);
  const codeRef = useRef(null);

  // Router hooks
  const location = useLocation();
  const { roomId } = useParams();
  const reactNavigator = useNavigate();

  // Connected clients state
  const [clients, setClients] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState("chat");
  const [activeLeftPanel, setActiveLeftPanel] = useState("editor");

  // Files list aur active file track karo
  const [files, setFiles] = useState([
    { id: "1", name: "main.cpp", content: "" },
  ]);
  const [activeFileId, setActiveFileId] = useState("1");

  useEffect(() => {
    // Initialize socket connection
    const init = async () => {
      socketRef.current = await initSocket();

      console.log("BACKEND URL:", import.meta.env.VITE_BACKEND_URL);
      console.log("Socket ID:", socketRef.current.id);

      // Handle socket errors
      function handleErrors(err) {
        console.log("socket error", err);
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      // Join room
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      console.log("JOIN emitted:", {
        roomId,
        username: location.state?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          console.log("JOINED EVENT");
          setClients([...clients]);

          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
          }

          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        },
      );

      // Listening for disconnected users
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      // Naya file create hone pe state update karo
      socketRef.current.on("file_create", ({ file }) => {
        setFiles((prev) => [...prev, file]);
      });

      // File delete hone pe list se hata do
      socketRef.current.on("file_delete", ({ fileId }) => {
        setFiles((prev) => {
          const remaining = prev.filter((f) => f.id !== fileId);
          if (activeFileId === fileId && remaining.length > 0) {
            setActiveFileId(remaining[0].id);
          }
          return remaining;
        });
      });

      // Doosre user ne file switch ki toh yahan bhi switch karo
      socketRef.current.on("file_switch", ({ fileId }) => {
        setActiveFileId(fileId);
      });
    };

    init();

    // Cleanup
    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
      socketRef.current?.off("file_create");
      socketRef.current?.off("file_delete");
      socketRef.current?.off("file_switch");
    };
  }, [roomId, location.state?.username, reactNavigator]);

  // Copy room id to clipboard
  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
      console.error(err);
    }
  }

  // Leave room
  function leaveRoom() {
    localStorage.removeItem(`code-${roomId}`);
    reactNavigator("/");
  }

  /* Redirect if no user data */
  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="appShell">
      {/* TOP BAR */}
      <header className="topBar">
        <div className="topBarLeft">
          <img className="topLogo" src="/code-sync.png" alt="logo" />
          <div className="roomInfo">
            <span className="roomName">
              Room: {location.state?.username}'s Room
            </span>
            <span className="onlineBadge">● Online ({clients.length})</span>
          </div>
        </div>

        <div className="topBarCenter">
          <div className="panelToggleGroup">
            <button
              className={`panelToggleBtn ${activeLeftPanel === "editor" ? "panelToggleActive" : ""}`}
              onClick={() => setActiveLeftPanel("editor")}
            >
              Code Editor
            </button>
            <button
              className={`panelToggleBtn ${activeLeftPanel === "whiteboard" ? "panelToggleActive" : ""}`}
              onClick={() => setActiveLeftPanel("whiteboard")}
            >
              Whiteboard
            </button>
          </div>
        </div>

        <div className="topBarRight">
          <div className="topAvatarRow">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
          <button className="btn copyBtn" onClick={copyRoomId}>
            Copy Room ID
          </button>
          <button className="btn leaveBtn" onClick={leaveRoom}>
            Leave
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="mainContent">
        {/* LEFT COMPONENT MASTER SYSTEM */}
        <div
          className="leftPanelContainer"
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* SIDE-BY-SIDE SIDEBAR AND WORKSPACE CONTAINER */}
          <div
            className="upperWorkspace"
            style={{ display: "flex", flex: 1, overflow: "hidden" }}
          >
            {/* 📁 File Sidebar (Hamesha visible rahega chahe Editor ho ya Whiteboard) */}
            <FilePanel
              files={files}
              activeFileId={activeFileId}
              onFileSelect={(fileId) => {
                setActiveFileId(fileId);
                socketRef.current.emit("file_switch", { roomId, fileId });
              }}
              onFileCreate={(name) => {
                const newFile = {
                  id: Date.now().toString(),
                  name,
                  content: "",
                };
                setFiles((prev) => [...prev, newFile]);
                setActiveFileId(newFile.id);
                socketRef.current.emit("file_create", {
                  roomId,
                  file: newFile,
                });
              }}
              onFileDelete={(fileId) => {
                if (files.length === 1) return;
                setFiles((prev) => prev.filter((f) => f.id !== fileId));
                if (activeFileId === fileId) setActiveFileId(files[0].id);
                socketRef.current.emit("file_delete", { roomId, fileId });
              }}
            />

            {/* 🎯 Main Editor Workspace Box — Iske andar toggle hoga Editor aur Whiteboard */}
            <div
              className="editorWorkspace"
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#1e1e24",
                position: "relative",
              }}
            >
              {activeLeftPanel === "editor" ? (
                <div
                  className="editorArea"
                  style={{ flex: 1, overflow: "auto" }}
                >
                  {socketRef.current && (
                    <Editor
                      socketRef={socketRef}
                      roomId={roomId}
                      activeFileId={activeFileId}
                      fileContent={
                        files.find((f) => f.id === activeFileId)?.content || ""
                      }
                      onCodeChange={(code) => {
                        codeRef.current = code;
                        setFiles((prev) =>
                          prev.map((file) =>
                            file.id === activeFileId
                              ? { ...file, content: code }
                              : file,
                          ),
                        );
                      }}
                    />
                  )}
                </div>
              ) : (
                /* 🚀 Whiteboard ab exact Code Editor ki size me khulega */
                <Whiteboard />
              )}
            </div>
          </div>

          {/* 🖥️ HORIZONTAL OUTPUT WINDOW (Yeh bhi hamesha dono ke niche tike rahega) */}
          <div
            className="outputSectionWrapper"
            style={{ height: "180px", borderTop: "1px solid #2d2d34" }}
          >
            <Output
              getCode={() => codeRef.current}
              languageId={() => {
                const activeFile = files.find((f) => f.id === activeFileId);
                if (!activeFile) return 71; // Default Python
                const extension = activeFile.name
                  .split(".")
                  .pop()
                  .toLowerCase();
                return extensionToLangMap[extension] || 71;
              }}
            />
          </div>
        </div>

        {/* RIGHT PANEL (Chat & AI Assistant) */}
        <div className="rightPanel">
          {/* Tabs */}
          <div className="rightTabs">
            <button
              className={`rightTab ${activeRightTab === "chat" ? "activeTab" : ""}`}
              onClick={() => setActiveRightTab("chat")}
            >
              Chat
            </button>
            <button
              className={`rightTab ${activeRightTab === "ai" ? "activeTab" : ""}`}
              onClick={() => setActiveRightTab("ai")}
            >
              AI Assistant
            </button>
          </div>
          {/* Content */}
          <div className="rightTabContent">
            {activeRightTab === "chat" ? (
              <ChatBox
                socketRef={socketRef}
                roomId={roomId}
                username={location.state?.username}
              />
            ) : (
              <AIChat getCode={() => codeRef.current} selectedLanguage={71} />
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="bottomBar">
        <span className="bottomBarLabel">Video Call — coming soon</span>
        <div className="bottomBarControls">
          <button className="mediaBtn" disabled>
            Mic
          </button>
          <button className="mediaBtn" disabled>
            Camera
          </button>
          <button className="mediaBtn" disabled>
            Screen Share
          </button>
          <button className="mediaBtn endCallBtn" disabled>
            End Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
