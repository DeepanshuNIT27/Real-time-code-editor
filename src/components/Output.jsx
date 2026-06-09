import React, { useState } from "react";

const Output = ({ getCode, languageId }) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const runCode = async () => {
    const code = getCode();
    if (!code) {
      setOutput("Please write some code first!");
      setIsError(true);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setOutput("");

      //  UPDATE 1: Deployment par ENV variable missing hone par crash se bachane ke liye strict check
      const judgeUrl = import.meta.env.VITE_JUDGE0_URL;
      if (!judgeUrl) {
        setOutput(
          "System Error: VITE_JUDGE0_URL is missing in cloud environment variables!",
        );
        setIsError(true);
        setIsLoading(false);
        return;
      }

      const submitResponse = await fetch(
        `${judgeUrl}/submissions?base64_encoded=true&wait=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: btoa(unescape(encodeURIComponent(code))),
            language_id:
              typeof languageId === "function" ? languageId() : languageId,
            stdin: input ? btoa(unescape(encodeURIComponent(input))) : "",
          }),
        },
      );

      // UPDATE 2: Agar API fail ho jaye toh JSON parse crash ko rokna
      if (!submitResponse.ok) {
        throw new Error(`API HTTP Error: ${submitResponse.status}`);
      }

      const result = await submitResponse.json();
      console.log("Judge0 Response:", result);

      if (result.stderr) {
        setOutput(atob(result.stderr));
        setIsError(true);
      } else if (result.compile_output) {
        setOutput(atob(result.compile_output));
        setIsError(true);
      } else if (result.status?.id !== 3) {
        setOutput(result.status?.description || "Unknown error!");
        setIsError(true);
      } else {
        setOutput(result.stdout ? atob(result.stdout) : "No output!");
        setIsError(false);
      }
    } catch (err) {
      console.error("Run code error:", err);
      //  UPDATE 3: Catch block ko thoda descriptive banaya taaki live bug easily samajh aaye
      setOutput(`Execution Failed: ${err.message}. Check browser console.`);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  // NAYA FUNCTION: Output clear karne ke liye
  const clearOutput = () => {
    setOutput("");
    setIsError(false);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#14141b",
        color: "#fff",
      }}
    >
      {/*  MAIN 50-50 SPLIT AREA */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT: Input Column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #3d3e59",
            padding: "12px",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "12px",
              color: "#fff",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Input
          </div>
          <textarea
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#d1d5db",
              outline: "none",
              resize: "none",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter input here..."
          />
        </div>

        {/* RIGHT: Output Column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "12px",
                color: "#fff",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Output
            </div>

            {/* 🎯 CLEAR BUTTON */}
            <button
              onClick={clearOutput}
              style={{
                backgroundColor: "#2b2c40",
                color: "#d1d5db",
                border: "1px solid #3d3e59",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = "#3d3e59")}
              onMouseOut={(e) => (e.target.style.backgroundColor = "#2b2c40")}
            >
              Clear
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "14px",
              // FIXED: Output color ab white (#fff) aayega, aur error par red.
              color: isError ? "#ef4444" : "#fff",
              whiteSpace: "pre-wrap",
            }}
          >
            {isLoading && (
              <span style={{ color: "#9ca3af" }}>Running code...</span>
            )}
            {!isLoading && output}
            {!isLoading && !output && (
              <span style={{ color: "#4b5563" }}>
                Output will appear here...
              </span>
            )}
          </div>
        </div>
      </div>

      {/*  BOTTOM: Run Button Row */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #3d3e59",
          backgroundColor: "#1e1e24",
          display: "flex",
          justifyContent: "flex-start",
        }}
      >
        <button
          onClick={runCode}
          disabled={isLoading}
          style={{
            backgroundColor: "#22c55e",
            color: "#000",
            fontWeight: "bold",
            border: "none",
            padding: "8px 20px",
            borderRadius: "6px",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "14px",
          }}
        >
          {isLoading ? (
            "⏳ Running..."
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Code
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Output;
