import React, { useState } from "react";

const getLanguageBadge = (filename) => {
  const ext = filename.split(".").pop();
  const map = {
    cpp: "C++",
    c: "C",
    py: "Py",
    js: "JS",
    jsx: "JSX",
    ts: "TS",
    java: "Java",
    txt: "T",
    md: "M↓",
    html: "HTML",
    css: "CSS",
  };
  return map[ext] || "?";
};

// Target UI ke dynamic colorful badges handle karne ke liye simple color function
const getBadgeStyle = (filename) => {
  const ext = filename.split(".").pop();
  if (ext === "cpp" || ext === "c")
    return {
      backgroundColor: "#1e293b",
      color: "#38bdf8",
      border: "1px solid #0369a1",
    }; // Blue look
  if (ext === "py")
    return {
      backgroundColor: "#3f2c0a",
      color: "#f59e0b",
      border: "1px solid #78350f",
    }; // Orange/Yellow look
  if (ext === "md")
    return {
      backgroundColor: "#1c2e24",
      color: "#4ade80",
      border: "1px solid #14532d",
    }; // Green look
  return {
    backgroundColor: "#2d2d34",
    color: "#a1a1aa",
    border: "1px solid #3f3f46",
  }; // Gray default
};

const FilePanel = ({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
}) => {
  // FIX: useState keyword ko hata kar wapas setNewFileName laga diya
  const [newFileName, setNewFileName] = useState("");
  const [showInput, setShowInput] = useState(false);

  const handleCreate = () => {
    const trimmedName = newFileName.trim();
    if (!trimmedName) return;

    // 🔍 Check karo ki kya ye naam pehle se kisi file ka hai
    const fileExists = files.some(
      (file) => file.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (fileExists) {
      alert(`A file named "${trimmedName}" already exists!`);
      return; // Naya file mat banane do, yahin se rok do
    }

    onFileCreate(trimmedName);
    setNewFileName("");
    setShowInput(false);
  };

  return (
    // 1. MASTER PANEL CONTAINER: Fix 240px width & standard VS Code background color
    <div className="filePanelContainer">
      {/* 2. HEADER SECTION: Spaced out row layout */}
      <div className="filePanelHeader">
        <span className="filePanelTitle">FILES</span>
        <button
          className="fileAddBtn"
          onClick={() => setShowInput(!showInput)}
          title="Add new file"
        >
          +
        </button>
      </div>

      {/* INPUT BAR BOX FOR CREATION */}
      {showInput && (
        <div className="fileInputRow">
          <input
            className="fileNameInput"
            placeholder="main.cpp"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setShowInput(false);
            }}
            autoFocus
          />
        </div>
      )}

      {/* 3. VERTICAL FILE TREE LIST */}
      <div className="fileListContainer">
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const badgeStyle = getBadgeStyle(file.name);

          return (
            <div
              key={file.id}
              className={`fileItem ${isActive ? "fileItemActive" : ""}`}
              onClick={() => onFileSelect(file.id)}
            >
              {/* File Name with standard emoji/icon placement */}
              <div className="fileItemLeft">
                <span className="fileItemIcon">{isActive ? "📄" : "📄"}</span>
                <span className="fileNameText">{file.name}</span>
              </div>

              {/* Right Side Tools System: Badges and Actions grouped cleanly */}
              <div className="fileItemRight">
                <span
                  className="fileBadge"
                  style={badgeStyle} // Applying dynamic colors safely
                >
                  {getLanguageBadge(file.name)}
                </span>

                <button
                  className="fileDeleteBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    // UPDATE 2: Active file delete hone se roka taaki component crash na ho
                    if (isActive) {
                      alert(
                        "You cannot delete the file you are currently viewing. Please switch to another file first.",
                      );
                      return;
                    }
                    onFileDelete(file.id);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilePanel;
