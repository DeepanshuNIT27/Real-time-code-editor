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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );
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
    <div className="aiChat">
      {/* messages list */}
      <div className="aiMessages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`aiMessage ${msg.role === "user" ? "aiUserMessage" : "aiAssistantMessage"}`}
          >
            <span className="aiMessageRole">
              {msg.role === "user" ? "You" : "AI"}
            </span>
            <p className="aiMessageText">{msg.content}</p>
          </div>
        ))}

        {/* loading indicator */}
        {isLoading && (
          <div className="aiMessage aiAssistantMessage">
            <span className="aiMessageRole">AI</span>
            <p className="aiMessageText">Thinking...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* input area */}
      <div className="aiInputRow">
        <input
          className="aiInput"
          type="text"
          placeholder="Ask AI about your code..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="aiSendBtn"
          onClick={sendMessage}
          disabled={isLoading}
        >
          Ask
        </button>
      </div>
    </div>
  );
};

export default AIChat;
