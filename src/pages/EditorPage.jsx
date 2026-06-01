import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

import ACTIONS from "../Actions.js";
import Client from "../components/Client.jsx";
import Editor from "../components/Editor.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import Output from "../components/Output.jsx";
import ChatBox from "../components/ChatBox.jsx";
import { initSocket } from "../socket.js";

import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";

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

  
  // localStorage se load karo
const [selectedLanguage, setSelectedLanguage] = useState(() => {
  const saved = localStorage.getItem(`language-${roomId}`);
  return saved ? Number(saved) : 71; // default Python (71)
});

  useEffect(() => {
    // Initialize socket connection
    const init = async () => {
      socketRef.current = await initSocket();

       console.log("BACKEND URL:", import.meta.env.VITE_BACKEND_URL);  /// YE LINE 
       console.log("Socket ID:", socketRef.current.id); // YE LINE ADD KIYA HU

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

      /// YE BHI NEW ADD KIYA HU DEKH LENA 
      console.log("JOIN emitted:", {
        roomId,
        username: location.state?.username,
      });


      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          console.log("JOINED EVENT");
          console.log("clients =>", clients);
          console.log("username =>", username);
          console.log("socketId =>", socketId);

          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }

          setClients([...clients]);

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
    };

    init();

    // Cleanup
    return () => {
      socketRef.current?.disconnect();
      socketRef.current?.off(ACTIONS.JOINED);
      socketRef.current?.off(ACTIONS.DISCONNECTED);
    };
  }, []);

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
    localStorage.removeItem(`language-${roomId}`);
    reactNavigator("/");
  }

  // Redirect if no user data
  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
        <div className="asideInner">
          <div className="logo">
            <img className="logoImage" src="/code-sync.png" alt="logo" />
          </div>

          <h3>Connected</h3>

          <div className="clientsList">
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>

        {/* Copy room id button */}
        <button className="btn copyBtn" onClick={copyRoomId}>
          Copy ROOM ID
        </button>

        {/* Leave room button */}
        <button className="btn leaveBtn" onClick={leaveRoom}>
          Leave
        </button>
      </div>

      <div className="editorWrap">
        {/*  Language dropdown */}
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={(lang) => {
            setSelectedLanguage(lang);
            localStorage.setItem(`language-${roomId}`, lang); //  save karo
          }}
        />
        {/* Code editor */}
        {socketRef.current && (
          <Editor
            socketRef={socketRef}
            roomId={roomId}
            onCodeChange={(code) => {
              codeRef.current = code;
            }}
          />
        )}

        {/*Input/Output box */}
        <Output getCode={() => codeRef.current} languageId={selectedLanguage} />
      </div>
      {/* chat box */}
      <ChatBox
        socketRef={socketRef}
        roomId={roomId}
        username={location.state?.username}
      />
    </div>
  );
};

export default EditorPage;
