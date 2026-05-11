import React, { useState, useRef, useEffect } from "react";
import Client from "../components/Client.jsx";
import Editor from "../components/Editor.jsx";
import { initSocket } from "../socket.js";
import { useLocation, useParams } from "react-router-dom";
import ACTIONS from "../Actions.js";

const EditorPage = () => {
  const socketRef = useRef(null);
  const location = useLocation();
  const { roomId } = useParams();

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state?.username,
      });
    };

    init();
  }, []);

  const [clients, setClients] = useState([
    { socketId: 1, username: "Deepanshu" },
    { socketId: 2, username: "Mayank Raj" },
    { socketId: 3, username: "Mayank Sinha" },
  ]);

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
