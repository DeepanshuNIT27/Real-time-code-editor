import React, { useState } from "react";

const Output = ({ getCode, languageId, onSave }) => {
  // 🟢 CHANGE 1: onSave prop add kiya
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

      // UPDATE 1: Deployment par ENV variable missing hone par crash se bachane ke liye strict check
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
      // UPDATE 3: Catch block ko thoda descriptive banaya taaki live bug easily samajh aaye
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
    <div className="outputContainer">
      {/* MAIN 50-50 SPLIT AREA */}
      <div className="outputSplitArea">
        {/* LEFT: Input Column */}
        <div className="ioColumn borderRight">
          <div className="ioHeader">
            <span className="ioTitle">
              <span className="ioIcon">⧉</span> INPUT
            </span>
            <button className="ioActionBtn iconBtn" title="Expand">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>
          <textarea
            className="ioTextarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter input here..."
          />
        </div>

        {/* RIGHT: Output Column */}
        <div className="ioColumn">
          <div className="ioHeader">
            <span className="ioTitle">
              <span className="ioIcon">⎋</span> OUTPUT
            </span>
            <button className="ioActionBtn textBtn" onClick={clearOutput}>
              Clear
            </button>
          </div>

          <div className={`ioContent ${isError ? "textError" : "textNormal"}`}>
            {isLoading && <span className="textLoading">Running code...</span>}
            {!isLoading && output}
            {!isLoading && !output && (
              <span className="textPlaceholder">
                Output will appear here...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Run Button Row */}
      <div className="outputFooterRow">
        <button className="runCodeBtn" onClick={runCode} disabled={isLoading}>
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
        {/* Save button placeholder matching target UI */}
        <button className="saveCodeBtn" onClick={onSave}>
          {" "}
          {/* 🟢 CHANGE 2: onClick={onSave} laga diya */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Save
        </button>
      </div>
    </div>
  );
};

export default Output;
