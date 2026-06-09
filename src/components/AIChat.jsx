import React, { useState, useRef, useEffect } from "react";

const AIChat = ({ getCode, selectedLanguage }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your coding assistant. Ask me anything about your code!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message;
    setMessage("");

    // add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "System Error: VITE_GEMINI_API_KEY is missing in cloud environment variables!",
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const currentCode = getCode();

      // build prompt with code context
      const prompt = `You are a coding assistant helping with code in a real-time collaborative editor.

Current code in editor:
\`\`\`
${currentCode || "No code written yet"}
\`\`\`

User question: ${userMessage}

Give a helpful, concise response. If asked for hints only give hints, if asked for solution give solution.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Gemini Response:", data);
      const aiResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I could not get a response!";

      // add ai response to chat
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse },
      ]);
    } catch (err) {
      console.error("Gemini API error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong! Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // send on Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="aiChatContainer">
      {/* messages list */}
      <div className="aiMessages">
        {messages.length === 0 ? (
          <div className="emptyChatState">
            No messages yet.
            <br />
            Start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`aiMessageWrapper ${
                msg.role === "user" ? "userWrapper" : "aiWrapper"
              }`}
            >
              <div
                className={`aiMessage ${
                  msg.role === "user" ? "aiUserMessage" : "aiAssistantMessage"
                }`}
              >
                <p className="aiMessageText">{msg.content}</p>
              </div>
            </div>
          ))
        )}

        {/* loading indicator */}
        {isLoading && (
          <div className="aiMessageWrapper aiWrapper">
            <div className="aiMessage aiAssistantMessage">
              <p className="aiMessageText">Thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* input area - Updated to match Target UI */}
      <div className="aiInputSection">
        <div className="aiInputRow">
          <span className="emojiIcon">😀</span>
          <input
            className="aiInput"
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="aiSendBtn"
            onClick={sendMessage}
            disabled={isLoading || !message.trim()}
          >
            {/* SVG icon for Send (Paper plane) matching target UI */}
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

export default AIChat;
