import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

import ACTIONS from "../Actions.js";
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
import {
  ParticipantView,
  SfuModels,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";

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

// NAYA COMPONENT: Dusre (remote) users ki screen share ko editor ki jagah badi dikhane ke liye
const RemoteScreenShareViewer = ({ children }) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  // Render as soon as the screen-share track is published so Stream can subscribe to it.
  const remoteSharer = participants.find(
    (p) =>
      !p.isLocalParticipant &&
      p.publishedTracks.includes(SfuModels.TrackType.SCREEN_SHARE),
  );

  if (remoteSharer) {
    return (
      <div className="remoteScreenShareOverlay">
        {/* Name Badge on top of screen share */}
        <div className="remoteShareBadge">
          Viewing {remoteSharer.name || "Remote User"}'s Screen
        </div>
        <ParticipantView
          participant={remoteSharer}
          trackType="screenShareTrack"
          muteAudio={true}
          className="remoteScreenShareParticipant"
          ParticipantViewUI={null}
        />
      </div>
    );
  }

  // Agar kisi remote user ne screen share nahi ki hai (ya tum khud kar rahe ho), toh normal Editor dikhao
  return children;
};

// FIX 1: Parent component context lifting shell setup
const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();

  if (!location.state) return <Navigate to="/" />;

  return <EditorPageContent roomId={roomId} locationState={location.state} />;
};

// Internal Collaborative Workspace Container System
const EditorPageContent = ({ roomId, locationState }) => {
  const socketRef = useRef(null);

  // 🟢 FIX 1: codeRef ko null ki jagah initial loaded file ke content se start kiya taaki code gayab na ho
  const codeRef = useRef(
    locationState?.files && locationState.files.length > 0
      ? locationState.files[0].content
      : "",
  );

  const reactNavigator = useNavigate();

  const [clients, setClients] = useState([]);
  const [activeRightTab, setActiveRightTab] = useState("chat");
  const [activeLeftPanel, setActiveLeftPanel] = useState("editor");
  const [currentSocketId, setCurrentSocketId] = useState(null);

  // 🟢 CHANGE START: Agar Home se purani 'files' aayi hain toh load karo, warna default main.cpp
  const [files, setFiles] = useState(
    locationState?.files && locationState.files.length > 0
      ? locationState.files
      : [{ id: "1", name: "main.cpp", content: "" }],
  );

  const [activeFileId, setActiveFileId] = useState(
    locationState?.files && locationState.files.length > 0
      ? locationState.files[0].id
      : "1",
  );
  // 🟢 CHANGE END

  // MASTER FIX 1: Socket ke andar fresh state access karne ke liye refs lagaye (Stale Closure fix)
  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const socket = await initSocket();

      if (!isMounted) {
        socket.disconnect();
        return;
      }

      socketRef.current = socket;

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
          // 🟢 DOUBLE NAME FIX: Ensure unique clients by socketId
          setClients((prev) => {
            const uniqueClients = [...prev];
            clients.forEach((newClient) => {
              if (
                !uniqueClients.some((c) => c.socketId === newClient.socketId)
              ) {
                uniqueClients.push(newClient);
              }
            });
            return uniqueClients;
          });

          if (username !== locationState?.username) {
            toast.success(`${username} joined the room.`);
          }

          // MASTER FIX 2: Naya user aane par sirf ek line nahi, POORA file system sync karo
          const currentCode = codeRef.current || "";
          const currentActiveId = activeFileIdRef.current;
          const updatedWorkspace = filesRef.current.map((f) =>
            f.id === currentActiveId ? { ...f, content: currentCode } : f,
          );

          // Local memory me bhi save rakho
          setFiles(updatedWorkspace);

          // Naye user ko poori files array aur current active file bhejo
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            socketId,
            code: currentCode, // Backward compatibility for older connections
            files: updatedWorkspace,
            activeFileId: currentActiveId,
          });
        },
      );

      // 🟢 MASTER FIX 6: Naya user jab data receive kare toh poori files list screen par load ho jaye
      socketRef.current.on(
        ACTIONS.CODE_CHANGE,
        ({
          fileId,
          code,
          files: incomingFiles,
          activeFileId: incomingActiveFileId,
        }) => {
          // Agar doosre client se poori file list aayi hai (naye user ko initialize karne ke liye)
          if (incomingFiles && incomingFiles.length > 0) {
            setFiles(incomingFiles);
            if (incomingActiveFileId) {
              setActiveFileId(incomingActiveFileId);
            }
          }

          // Single file code change ko update karne ka logic
          if (fileId) {
            setFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, content: code } : f)),
            );
            if (fileId === activeFileIdRef.current) {
              codeRef.current = code;
            }
          } else {
            codeRef.current = code;
          }
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

      // MASTER FIX 3: Remote user jab file switch kare, toh apni current mehnat bhi save karo
      socketRef.current.on("file_switch", ({ fileId }) => {
        const currentCode = codeRef.current || "";
        const oldActiveId = activeFileIdRef.current;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === oldActiveId ? { ...f, content: currentCode } : f,
          ),
        );

        setActiveFileId(fileId);

        // Incoming file ka content load karo taaki pichla text na dikhe
        const incomingFile = filesRef.current.find((f) => f.id === fileId);
        codeRef.current = incomingFile?.content || "";
      });

      socketRef.current.on("panel_switch", ({ panel }) => {
        setActiveLeftPanel(panel);
      });
    };

    init();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
      socketRef.current?.off("file_create");
      socketRef.current?.off("file_delete");
      socketRef.current?.off("file_switch");
      socketRef.current?.off("panel_switch");
      socketRef.current?.off(ACTIONS.CODE_CHANGE); // Ensure listener is cleaned up
    };
    // 🟢 DOUBLE NAME FIX: reactNavigator ko dependency array se hata diya, taaki render pe reconnect na ho
  }, [roomId, locationState?.username]);

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

  // 🟢 NAYA FUNCTION: DB me files save karne ke liye (Ab dynamic URL ke sath)
  const handleSaveRoom = async () => {
    try {
      // Pehle current screen wala code files array me update karo
      const currentCode = codeRef.current || "";
      const updatedFilesForDB = filesRef.current.map((f) =>
        f.id === activeFileIdRef.current ? { ...f, content: currentCode } : f,
      );

      const token = localStorage.getItem("token");

      // 🟢 CHANGE: Local ke liye localhost, deploy hone par .env wala URL chalega
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

      const response = await fetch(`${backendUrl}/api/rooms/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId,
          // 🟢 FIX 2: Ab asli roomName jayega backend me
          name: locationState?.roomName || "Collab Room",
          isSaved: true,
          files: updatedFilesForDB,
        }),
      });

      if (response.ok) {
        toast.success("Files saved successfully!");
      } else {
        const errorData = await response.json();
        console.error("Save Error:", errorData);
        toast.error(errorData.error || "Failed to save files.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving.");
    }
  };

  return (
    <VideoCallProvider
      userId={currentSocketId || "temp-id"}
      userName={locationState?.username}
      roomId={roomId}
    >
      <div className="appShell">
        {/* TOP BAR */}
        <header className="topBar">
          <div className="topBarLeft">
            <img className="topLogo" src="/code-sync.png" alt="CodeSync Logo" />
            <div className="roomInfo">
              <span className="roomName">
                {/* 🟢 FIX 3: Top bar me bhi asli naam dikhega */}
                Room: {locationState?.roomName || "Collab Room"}
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
            <button className="btn copyBtn" onClick={copyRoomId}>
              Copy Room ID
            </button>
            <button className="btn leaveBtn" onClick={leaveRoom}>
              Leave
            </button>
          </div>
        </header>

        {/* CENTER WORKSPACE SYSTEM AREA */}
        <div className="mainContent">
          <div className="leftPanelContainer">
            <div className="upperWorkspace">
              <FilePanel
                files={files}
                activeFileId={activeFileId}
                onFileSelect={(fileId) => {
                  if (fileId === activeFileId) return;

                  // MASTER FIX 4: Doosri file pe jane se pehle current editor ka code save karo
                  const currentMemoryCode = codeRef.current || "";
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === activeFileId
                        ? { ...f, content: currentMemoryCode }
                        : f,
                    ),
                  );

                  const incomingFile = files.find((f) => f.id === fileId);
                  codeRef.current = incomingFile?.content || "";

                  setActiveFileId(fileId);
                  socketRef.current.emit("file_switch", { roomId, fileId });
                }}
                onFileCreate={(name) => {
                  // MASTER FIX 5: Nayi file banane par purana code save karo
                  const currentMemoryCode = codeRef.current || "";
                  const newFile = {
                    id: Date.now().toString(),
                    name,
                    content: "",
                  };

                  setFiles((prev) => {
                    const updated = prev.map((f) =>
                      f.id === activeFileId
                        ? { ...f, content: currentMemoryCode }
                        : f,
                    );
                    return [...updated, newFile];
                  });

                  codeRef.current = ""; // Nayi file ekdum blank
                  setActiveFileId(newFile.id);

                  socketRef.current.emit("file_create", {
                    roomId,
                    file: newFile,
                  });
                  socketRef.current.emit("file_switch", {
                    roomId,
                    fileId: newFile.id,
                  });
                }}
                onFileDelete={(fileId) => {
                  if (files.length === 1) return;
                  setFiles((prev) => prev.filter((f) => f.id !== fileId));
                  socketRef.current.emit("file_delete", { roomId, fileId });
                }}
              />

              <div className="editorWorkspace">
                <RemoteScreenShareViewer>
                  <div
                    className="editorArea"
                    style={{
                      display: activeLeftPanel === "editor" ? "block" : "none",
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

                  <div
                    className="whiteboardArea"
                    style={{
                      display:
                        activeLeftPanel === "whiteboard" ? "block" : "none",
                    }}
                  >
                    <Whiteboard socketRef={socketRef} roomId={roomId} />
                  </div>
                </RemoteScreenShareViewer>
              </div>
            </div>

            <div className="outputSectionWrapper">
              {/* 🟢 YAHAN CHANGE KIYA HAI: onSave prop add kar diya */}
              <Output
                getCode={() => codeRef.current}
                languageId={getCurrentLanguageId}
                onSave={handleSaveRoom}
              />
            </div>
          </div>

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

            <div className="rightTabContent">
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

        <div className="bottomBar">
          {currentSocketId ? (
            <VideoContainer />
          ) : (
            <div className="bottomLoader">
              Connecting and verifying hardware sync signals...
            </div>
          )}
        </div>
      </div>
    </VideoCallProvider>
  );
};

export default EditorPage;
