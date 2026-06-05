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

// Safe wrapper injection layer imports
import { VideoCallProvider } from "../context/VideoCallContext.jsx";
import VideoContainer from "../components/VideoContainer.jsx";
import { useCallStateHooks } from "@stream-io/video-react-sdk"; // 🎯 FIX: Screen state padhne ke liye naya import

import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";

const extensionToLangMap = {
  cpp: 54,
  py: 71,
  js: 63,
  java: 62,
  c: 50,
  go: 60,
  rb: 72,
};

// 🎯 NAYA COMPONENT: Dusre (remote) users ki screen share ko editor ki jagah badi dikhane ke liye
const RemoteScreenShareViewer = ({ children }) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  // Check karo agar koi aisa participant hai jo 'local' nahi hai aur uski screen share stream chal rahi hai
  const remoteSharer = participants.find(
    (p) => !p.isLocalParticipant && p.screenShareStream,
  );

  if (remoteSharer) {
    return (
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Name Badge on top of screen share */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 16,
            zIndex: 50,
            backgroundColor: "#3b82f6",
            padding: "6px 12px",
            borderRadius: "6px",
            color: "white",
            fontSize: "13px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          👁️ Viewing {remoteSharer.name || "Remote User"}'s Screen
        </div>
        <video
          autoPlay
          playsInline
          ref={(el) => {
            if (el && remoteSharer.screenShareStream)
              el.srcObject = remoteSharer.screenShareStream;
          }}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  // Agar kisi remote user ne screen share nahi ki hai (ya tum khud kar rahe ho), toh normal Editor dikhao
  return children;
};

// 🎯 FIX 1: Parent component context lifting shell setup
const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();

  if (!location.state) return <Navigate to="/" />;

  return <EditorPageContent roomId={roomId} locationState={location.state} />;
};

// Internal Collaborative Workspace Container System
const EditorPageContent = ({ roomId, locationState }) => {
  const socketRef = useRef(null);
  const codeRef = useRef(null);
  const reactNavigator = useNavigate();

  const [clients, setClients] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState("chat");
  const [activeLeftPanel, setActiveLeftPanel] = useState("editor");
  const [currentSocketId, setCurrentSocketId] = useState(null);

  const [files, setFiles] = useState([
    { id: "1", name: "main.cpp", content: "" },
  ]);
  const [activeFileId, setActiveFileId] = useState("1");

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      if (socketRef.current && socketRef.current.id) {
        setCurrentSocketId(socketRef.current.id);
      }

      function handleErrors(err) {
        toast.error("Socket connection failed, try again later.");
        reactNavigator("/");
      }

      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: locationState?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          setClients([...clients]);
          if (username !== locationState?.username) {
            toast.success(`${username} joined the room.`);
          }
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        },
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room.`);
        setClients((prev) => prev.filter((c) => c.socketId !== socketId));
      });

      socketRef.current.on("file_create", ({ file }) =>
        setFiles((prev) => [...prev, file]),
      );

      socketRef.current.on("file_delete", ({ fileId }) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      });

      socketRef.current.on("file_switch", ({ fileId }) =>
        setActiveFileId(fileId),
      );

      socketRef.current.on("panel_switch", ({ panel }) => {
        setActiveLeftPanel(panel);
      });
    };

    init();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
      socketRef.current?.off("file_create");
      socketRef.current?.off("file_delete");
      socketRef.current?.off("file_switch");
      socketRef.current?.off("panel_switch");
    };
  }, [roomId, locationState?.username, reactNavigator]);

  const getCurrentLanguageId = () => {
    const activeFile = files.find((f) => f.id === activeFileId);
    if (!activeFile) return 71;

    const parts = activeFile.name.split(".");
    const extension = parts[parts.length - 1];

    return extensionToLangMap[extension] || 71;
  };

  async function copyRoomId() {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID has been copied to your clipboard");
    } catch (err) {
      toast.error("Could not copy the Room ID");
    }
  }

  function leaveRoom() {
    localStorage.removeItem(`code-${roomId}`);
    reactNavigator("/");
  }

  return (
    <VideoCallProvider
      userId={currentSocketId || "temp-id"}
      userName={locationState?.username}
      roomId={roomId}
    >
      <div
        className="appShell"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* 🟢 TOP BAR */}
        <header className="topBar" style={{ flexShrink: 0 }}>
          <div className="topBarLeft">
            <img className="topLogo" src="/code-sync.png" alt="logo" />
            <div className="roomInfo">
              <span className="roomName">
                Room: {locationState?.username}'s Room
              </span>
              <span className="onlineBadge">● Online ({clients.length})</span>
            </div>
          </div>

          <div className="topBarCenter">
            <div className="panelToggleGroup">
              <button
                className={`panelToggleBtn ${activeLeftPanel === "editor" ? "panelToggleActive" : ""}`}
                onClick={() => {
                  setActiveLeftPanel("editor");
                  socketRef.current?.emit("panel_switch", {
                    roomId,
                    panel: "editor",
                  });
                }}
              >
                Code Editor
              </button>
              <button
                className={`panelToggleBtn ${activeLeftPanel === "whiteboard" ? "panelToggleActive" : ""}`}
                onClick={() => {
                  setActiveLeftPanel("whiteboard");
                  socketRef.current?.emit("panel_switch", {
                    roomId,
                    panel: "whiteboard",
                  });
                }}
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

        {/* 🔵 CENTER WORKSPACE SYSTEM AREA */}
        <div
          className="mainContent"
          style={{ flex: 1, overflow: "hidden", display: "flex" }}
        >
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
            <div
              className="upperWorkspace"
              style={{ display: "flex", flex: 1, overflow: "hidden" }}
            >
              <FilePanel
                files={files}
                activeFileId={activeFileId}
                onFileSelect={(fileId) => {
                  const currentMemoryCode = codeRef.current || "";
                  setFiles((p) =>
                    p.map((f) =>
                      f.id === activeFileId
                        ? { ...f, content: currentMemoryCode }
                        : f,
                    ),
                  );
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
                  socketRef.current.emit("file_delete", { roomId, fileId });
                }}
              />

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
                <RemoteScreenShareViewer>
                  {/* 🎯 NAYA FIX: Dono components rendered hain, CSS se toggle honge */}

                  {/* 1. Editor Section */}
                  <div
                    className="editorArea"
                    style={{
                      flex: 1,
                      overflow: "auto",
                      display: activeLeftPanel === "editor" ? "block" : "none",
                      height: "100%",
                    }}
                  >
                    {socketRef.current && (
                      <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        activeFileId={activeFileId}
                        fileContent={
                          files.find((f) => f.id === activeFileId)?.content ||
                          ""
                        }
                        onCodeChange={(code) => {
                          codeRef.current = code;
                        }}
                      />
                    )}
                  </div>

                  {/* 2. Whiteboard Section */}
                  <div
                    className="whiteboardArea"
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      display:
                        activeLeftPanel === "whiteboard" ? "block" : "none",
                      height: "100%",
                    }}
                  >
                    <Whiteboard socketRef={socketRef} roomId={roomId} />
                  </div>
                </RemoteScreenShareViewer>
              </div>
            </div>

            {/* 🔴 OUTPUT COMPILER ARTIFACT MOUNT LAYER */}
            <div
              className="outputSectionWrapper"
              style={{
                height: "180px",
                borderTop: "1px solid #2d2d34",
                flexShrink: 0,
              }}
            >
              <Output
                getCode={() => codeRef.current}
                languageId={getCurrentLanguageId}
              />
            </div>
          </div>

          {/* SIDE TABS AREA PANEL */}
          <div className="rightPanel">
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

            <div
              className="rightTabContent"
              style={{ flex: 1, overflow: "hidden" }}
            >
              <div
                style={{
                  display: activeRightTab === "chat" ? "block" : "none",
                  height: "100%",
                }}
              >
                <ChatBox
                  socketRef={socketRef}
                  roomId={roomId}
                  username={locationState?.username}
                />
              </div>

              <div
                style={{
                  display: activeRightTab === "ai" ? "block" : "none",
                  height: "100%",
                }}
              >
                <AIChat getCode={() => codeRef.current} />
              </div>
            </div>
          </div>
        </div>

        {/* 🟠 BOTTOM PANEL WITH SEALED PROVIDER CONTROLS */}
        <div
          className="bottomBar"
          style={{
            height: "110px",
            padding: "0",
            flexShrink: 0,
            overflow: "hidden",
            backgroundColor: "#14141b",
          }}
        >
          {currentSocketId ? (
            <VideoContainer />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400 text-sm">
              Connecting and verifying hardware sync signals...
            </div>
          )}
        </div>
      </div>
    </VideoCallProvider>
  );
};

export default EditorPage;
