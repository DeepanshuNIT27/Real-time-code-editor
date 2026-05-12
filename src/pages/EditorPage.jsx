import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import Client from "../components/Client.jsx";
import Editor from "../components/Editor.jsx";
import { initSocket } from "../socket.js";

import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";

import ACTIONS from "../Actions.js";

const EditorPage = () => {
  const socketRef = useRef(null);

  const location = useLocation();
  const reactNavigator = useNavigate();

  const { roomId } = useParams();

  const [clients, setClients] = useState([
    { socketId: 1, username: "Deepanshu" },
    { socketId: 2, username: "Mayank Raj" },
    { socketId: 3, username: "Mayank Sinha" },
  ]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      const handleErrors = (e) => {
        console.log("socket error ", e);

        toast.error("Socket connection failed, try again later.");

        reactNavigator("/");
      };

      socketRef.current.on("connect_error", handleErrors);
      socketRef.current.on("connect_failed", handleErrors);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });

      // Listening for joined
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== location.state?.username) {
            toast.success(`${username} joined the room.`);
            console.log(`${username} joined`);
          }

          setClients(clients);
        },
      );
    };

    init();
  }, []);

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

        <button className="btn copyBtn">Copy ROOM ID</button>

        <button className="btn leaveBtn">Leave</button>
      </div>

      <div className="editorWrap">
        <Editor />
      </div>
    </div>
  );
};

export default EditorPage;
