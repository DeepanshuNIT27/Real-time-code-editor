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
    let interval;

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
    <div className="chatBoxContainer">
      {/* 💬 MESSAGES LIST */}
      <div ref={chatMessagesRef} className="chatMessagesList">
        {messages.length === 0 && (
          <div className="emptyChatState">
            No messages yet.
            <br />
            Start the conversation!
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="chatMessageRow">
            {/* Avatar */}
            <div
              className="chatAvatar"
              style={{ backgroundColor: getAvatarColor(msg.username) }}
            >
              {msg.username.charAt(0).toUpperCase()}
            </div>

            {/* Message Details */}
            <div className="chatContent">
              <div className="chatHeader">
                <span className="chatUsername">
                  {msg.username === username ? "You" : msg.username}
                </span>
                {msg.time && <span className="chatTime">{msg.time}</span>}
              </div>
              <p className="chatText">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 🔵 UPGRADED INPUT AREA (Target UI Style) */}
      <div className="chatInputSection">
        {showEmojiPicker && (
          <div ref={pickerRef} className="emojiPickerContainer">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              width={280}
              height={350}
            />
          </div>
        )}

        <div className="chatInputRow">
          {/* Emoji Button */}
          <span
            className="emojiIcon"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Add Emoji"
          >
            😀
          </span>

          {/* Pill-shaped Input Field */}
          <input
            className="chatInput"
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />

          {/* SVG Arrow Send Button */}
          <button
            className="chatSendBtn"
            onClick={sendMessage}
            disabled={!message.trim()}
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="18px"
              width="18px"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;
