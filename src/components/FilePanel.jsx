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
      return; // 🛑 Naya file mat banane do, yahin se rok do
    }

    onFileCreate(trimmedName);
    setNewFileName("");
    setShowInput(false);
  };
  return (
    // 1. MASTER PANEL CONTAINER: Fix 240px width & standard VS Code background color
    <div
      className="filePanel"
      style={{
        width: "240px",
        minWidth: "240px",
        backgroundColor: "#14141b",
        borderRight: "1px solid #23232f",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        selectZone: "none",
      }}
    >
      {/* 2. HEADER SECTION: Spaced out row layout */}
      <div
        className="filePanelHeader"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #23232f",
        }}
      >
        <span
          className="filePanelTitle"
          style={{
            fontSize: "11px",
            fontWeight: "700",
            tracking: "0.1em",
            color: "#6b7280",
          }}
        >
          FILES
        </span>
        <button
          className="fileAddBtn"
          onClick={() => setShowInput(!showInput)}
          style={{
            background: "#1c1c24",
            color: "#4ade80",
            border: "none",
            width: "22px",
            height: "22px",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>

      {/* INPUT BAR BOX FOR CREATION */}
      {showInput && (
        <div className="fileInputRow" style={{ padding: "8px 12px" }}>
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
            style={{
              width: "100%",
              backgroundColor: "#0f0f13",
              border: "1px solid #3b82f6",
              borderRadius: "4px",
              padding: "6px 10px",
              color: "#e5e7eb",
              fontSize: "12px",
              outline: "none",
            }}
          />
        </div>
      )}

      {/* 3. VERTICAL FILE TREE LIST */}
      <div
        className="fileList"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 4px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {files.map((file) => {
          const isActive = file.id === activeFileId;
          const badgeStyle = getBadgeStyle(file.name);

          return (
            <div
              key={file.id}
              className={`fileItem ${isActive ? "fileItemActive" : ""}`}
              onClick={() => onFileSelect(file.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                backgroundColor: isActive ? "#1c1c24" : "transparent",
                borderLeft: isActive
                  ? "3px solid #3b82f6"
                  : "3px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {/* File Name with standard emoji/icon placement */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: isActive ? "#3b82f6" : "#9ca3af",
                  }}
                >
                  📄
                </span>
                <span
                  className="fileName"
                  style={{
                    fontSize: "13px",
                    color: isActive ? "#ffffff" : "#9ca3af",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </span>
              </div>

              {/* Right Side Tools System: Badges and Actions grouped cleanly */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span
                  className="fileBadge"
                  style={{
                    fontSize: "9px",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    ...badgeStyle,
                  }}
                >
                  {getLanguageBadge(file.name)}
                </span>

                <button
                  className="fileDeleteBtn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileDelete(file.id);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: "0 2px",
                    fontWeight: "bold",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#f87171")}
                  onMouseLeave={(e) => (e.target.style.color = "#6b7280")}
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
