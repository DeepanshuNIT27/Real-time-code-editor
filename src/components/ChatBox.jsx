import React, { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";

const ChatBox = ({ socketRef, roomId, username }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const storageKey = `chat-messages-${roomId}`;

  const chatMessagesRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(storageKey);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (err) {
      console.error("Failed to restore chat messages:", err);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (err) {
      console.error("Failed to save chat messages:", err);
    }
  }, [messages, storageKey]);

  // 1. Listen for incoming messages
  useEffect(() => {
    let interval; // UPDATE 1: Interval ko bahar declare kiya taaki attach hone par usko rok sakein

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

        //  UPDATE 2: Listener attach hote hi background interval ko rok do (Memory Leak aur Duplicate messages fixed!)
        clearInterval(interval);
      }
    };

    interval = setInterval(attachListener, 500);
    attachListener();

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off("receive_message");
      }
    };
  }, [socketRef]);

  // 2. Scroll to bottom automatically
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

  // Avatar colors
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
      {/*  MESSAGES LIST */}
      <div
        ref={chatMessagesRef}
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
            {/* Avatar */}
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

            {/* Message Details */}
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

      {/* 🔵 UPGRADED INPUT AREA (Target Image Style) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "12px",
          backgroundColor: "#1c1c27",
          borderTop: "1px solid #2d2d34",
          position: "relative",
          width: "100%",
          boxSizing: "border-box",
          alignItems: "center",
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

        {/* Emoji Button */}
        <button
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          style={{
            padding: "8px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: "transparent",
            color: "#888",
            cursor: "pointer",
            fontSize: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "0.2s",
            flexShrink: 0,
          }}
          title="Add Emoji"
        >
          😀
        </button>

        {/* Pill-shaped Input Field */}
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 14px",
            borderRadius: "20px",
            border: "1px solid #3d3e59",
            backgroundColor: "#2a2b3d",
            color: "#fff",
            fontSize: "14px",
            outline: "none",
          }}
        />

        {/* SVG Arrow Send Button */}
        <button
          onClick={sendMessage}
          style={{
            padding: "8px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: message.trim() ? "#4aed88" : "#2a2b3d",
            color: message.trim() ? "#000" : "#888",
            cursor: message.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            transition: "0.3s ease",
            flexShrink: 0,
          }}
          disabled={!message.trim()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ width: "18px", height: "18px", marginLeft: "2px" }}
          >
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
