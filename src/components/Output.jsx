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

    if (!input) {
      setOutput("Please enter the input first!");
      setIsError(true);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setOutput("");

      const submitResponse = await fetch(
        `${import.meta.env.VITE_JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: btoa(unescape(encodeURIComponent(code))),
            language_id: languageId,
            stdin: input ? btoa(unescape(encodeURIComponent(input))) : "",
          }),
        },
      );

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
      setOutput("Something went wrong! Check console.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="outputWrap">
      {/* input box */}
      <div className="inputSection">
        <p className="ioLabel">Input (stdin)</p>
        <textarea
          className="ioBox"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter input here..."
          rows={3}
        />
      </div>

      {/* run button */}
      <button className="btn runBtn" onClick={runCode} disabled={isLoading}>
        {isLoading ? "Running..." : "Run Code"}
      </button>

      {/* output box */}
      <div className="outputSection">
        <p className="ioLabel">Output</p>
        <div className={`ioBox outputBox ${isError ? "errorOutput" : ""}`}>
          {isLoading && <span>Running...</span>}
          {!isLoading && output}
          {!isLoading && !output && (
            <span className="placeholder">Output will appear here...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Output;
