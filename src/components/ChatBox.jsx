import React, { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const ChatBox = ({ socketRef, roomId, username }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 🎯 FIX: Puraane ref ki jagah ab hum pure chat list container ka ref use karenge
  const chatMessagesRef = useRef(null);
  const pickerRef = useRef(null);

  // 1. Listen for incoming messages
  useEffect(() => {
    const attachListener = () => {
      if (
        socketRef.current &&
        !socketRef.current.hasListeners("receive_message")
      ) {
        socketRef.current.on("receive_message", (data) => {
          const currentTime = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          setMessages((prev) => [...prev, { ...data, time: currentTime }]);
        });
      }
    };

    const interval = setInterval(attachListener, 500);
    attachListener();

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off("receive_message");
      }
    };
  }, []);

  // 2. 🎯 FIX: Strictly chat container ke andar scroll karo (Main page bilkul nahi hilega)
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 4. Send Message Logic
  const sendMessage = () => {
    if (!message.trim() || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      roomId,
      message,
      username,
    });

    setMessage("");
    setShowEmojiPicker(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setMessage((prev) => prev + emojiObject.emoji);
  };

  // Helper function to generate consistent avatar background colors
  const getAvatarColor = (name) => {
    const colors = [
      "#ef4444",
      "#3b82f6",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      className="chatBox"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#14141b",
      }}
    >
      {/* 🟢 MESSAGES LIST (Ref updated here) */}
      <div
        ref={chatMessagesRef} // 🎯 Ref assigned here
        className="chatMessages"
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {messages.length === 0 && (
          <p
            style={{
              color: "#64748b",
              fontSize: "13px",
              textAlign: "center",
              marginTop: "20px",
            }}
          >
            No messages yet. Start the conversation!
          </p>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
          >
            {/* Circular Avatar Logo */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: getAvatarColor(msg.username),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {msg.username.charAt(0).toUpperCase()}
            </div>

            {/* Name, Time and Message Text */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                paddingTop: "2px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#e2e8f0",
                  }}
                >
                  {msg.username === username ? "You" : msg.username}
                </span>
                {msg.time && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {msg.time}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#cbd5e1",
                  lineHeight: "1.5",
                  wordBreak: "break-word",
                }}
              >
                {msg.message}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 🔵 INPUT AREA */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          padding: "12px 16px",
          backgroundColor: "#1c1c27",
          borderTop: "1px solid #2d2d34",
          position: "relative",
        }}
      >
        {showEmojiPicker && (
          <div
            ref={pickerRef}
            style={{
              position: "absolute",
              bottom: "70px",
              left: "16px",
              zIndex: 1000,
              boxShadow: "0 5px 20px rgba(0,0,0,0.4)",
            }}
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              width={280}
              height={350}
            />
          </div>
        )}

        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#2b2c40",
            color: "#fff",
            cursor: "pointer",
            fontSize: "18px",
            transition: "0.2s",
          }}
          title="Add Emoji"
        >
          😀
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #3d3e59",
            backgroundColor: "#0d0d12",
            color: "#fff",
            fontSize: "14px",
            outline: "none",
          }}
        />

        <button
          onClick={sendMessage}
          style={{
            padding: "0 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#22c55e",
            color: "#fff",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "14px",
            transition: "0.2s",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
