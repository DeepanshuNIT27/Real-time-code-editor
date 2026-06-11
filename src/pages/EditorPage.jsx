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

const RemoteScreenShareViewer = ({ children }) => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  const remoteSharer = participants.find(
    (p) =>
      !p.isLocalParticipant &&
      p.publishedTracks.includes(SfuModels.TrackType.SCREEN_SHARE),
  );

  if (remoteSharer) {
    return (
      <div className="remoteScreenShareOverlay">
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
  return children;
};

const EditorPage = () => {
  const location = useLocation();
  const { roomId } = useParams();

  if (!location.state) return <Navigate to="/" />;

  return <EditorPageContent roomId={roomId} locationState={location.state} />;
};

const EditorPageContent = ({ roomId, locationState }) => {
  const socketRef = useRef(null);

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

  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);
  const isWorkspaceSynced = useRef(false);

  // 🌟 FIX: Page reload hone par unsaved changes udne se bachane ke liye warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    let isMounted = true;

    const handleConnectError = (err) => {
      toast.error("Socket connection failed, try again later.");
      reactNavigator("/");
    };

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

      socketRef.current.on("connect_error", handleConnectError);
      socketRef.current.on("connect_failed", handleConnectError);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: locationState?.username,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          let uniqueClients = [];
          setClients((prev) => {
            uniqueClients = [...prev];
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

          if (socketId !== socketRef.current.id) {
            const currentCode = codeRef.current || "";
            const currentActiveId = activeFileIdRef.current;
            const updatedWorkspace = filesRef.current.map((f) =>
              f.id === currentActiveId ? { ...f, content: currentCode } : f,
            );

            socketRef.current.emit(ACTIONS.SYNC_CODE, {
              socketId,
              code: currentCode,
              files: updatedWorkspace,
              activeFileId: currentActiveId,
            });
          }
        },
      );

      socketRef.current.on(
        "sync_workspace",
        ({
          code,
          files: incomingFiles,
          activeFileId: incomingActiveFileId,
        }) => {
          if (isWorkspaceSynced.current) return;

          if (incomingFiles && incomingFiles.length > 0) {
            setFiles(incomingFiles);
            if (incomingActiveFileId) {
              setActiveFileId(incomingActiveFileId);
            }

            const activeFileData = incomingFiles.find(
              (f) => f.id === incomingActiveFileId,
            );

            codeRef.current = activeFileData
              ? activeFileData.content
              : code || "";

            isWorkspaceSynced.current = true;
          }
        },
      );

      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ fileId, code }) => {
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
      });

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

      socketRef.current.on("file_switch", ({ fileId }) => {
        const currentCode = codeRef.current || "";
        const oldActiveId = activeFileIdRef.current;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === oldActiveId ? { ...f, content: currentCode } : f,
          ),
        );

        setActiveFileId(fileId);

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
      if (socketRef.current) {
        socketRef.current.off("connect_error");
        socketRef.current.off("connect_failed");
        socketRef.current.off(ACTIONS.JOINED);
        socketRef.current.off(ACTIONS.DISCONNECTED);
        socketRef.current.off("file_create");
        socketRef.current.off("file_delete");
        socketRef.current.off("file_switch");
        socketRef.current.off("panel_switch");
        socketRef.current.off("sync_workspace");
        socketRef.current.off(ACTIONS.CODE_CHANGE);
        socketRef.current.disconnect();
      }
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

  const handleSaveRoom = async () => {
    try {
      const currentCode = codeRef.current || "";
      const updatedFilesForDB = filesRef.current.map((f) =>
        f.id === activeFileIdRef.current ? { ...f, content: currentCode } : f,
      );

      const token = localStorage.getItem("token");
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

                  codeRef.current = "";
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
