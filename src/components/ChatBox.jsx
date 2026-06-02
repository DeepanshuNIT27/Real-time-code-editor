import React, { useState, useEffect, useRef } from "react";

const ChatBox = ({ socketRef, roomId, username }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null); // auto scroll ref

 useEffect(() => {
   if (!socketRef.current) return;

   const socket = socketRef.current;

   socket.on("receive_message", ({ message, username }) => {
     setMessages((prev) => [...prev, { message, username }]);
   });

   return () => {
     socket.off("receive_message");
   };
 }, [socketRef.current]);

  // scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return; // skip empty messages

    socketRef.current.emit("send_message", {
      roomId,
      message,
      username,
    });

    setMessage(""); // clear input
  };

  // send on Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chatBox">
      {/* messages list */}
      <div className="chatMessages">
        {messages.length === 0 && (
          <p className="noMessages">No messages yet...</p>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chatMessage ${msg.username === username ? "myMessage" : "theirMessage"}`}
          >
            <span className="chatUsername">{msg.username}</span>
            <p className="chatText">{msg.message}</p>
          </div>
        ))}
        {/* auto scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* input area */}
      <div className="chatInputRow">
        <input
          className="chatInput"
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button className="chatSendBtn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
