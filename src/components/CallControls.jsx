import React, { useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";

const CallControls = () => {
  const call = useCall();

  const [isMuted, setIsMuted] = useState(true);
  const [isCamOff, setIsCamOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  //  UPDATE 1: Hardware crash aur overlapping API calls rokne ke liye processing state
  const [isProcessing, setIsProcessing] = useState(false);

  if (!call) return null;

  const toggleMic = async () => {
    //  UPDATE 2: Agar pichli request chal rahi hai, toh naye clicks ko ignore karo
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isMuted) {
        await call.microphone.enable();
      } else {
        await call.microphone.disable();
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error("Mic toggle crash block handled:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCam = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isCamOff) {
        await call.camera.enable();
      } else {
        await call.camera.disable();
      }
      setIsCamOff(!isCamOff);
    } catch (err) {
      console.error("Camera toggle crash block handled:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleScreenShare = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (isScreenSharing) {
        await call.screenShare.disable();
      } else {
        await call.screenShare.enable();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error("Screen share toggle crash block handled:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reusable styles
  const btnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: isProcessing ? "wait" : "pointer", //  UPDATE 3: Loading cursor for better UX
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease-in-out",
    color: "#fff",
    opacity: isProcessing ? 0.7 : 1, // Feedback that action is processing
  };

  const wrapperStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  };

  const labelStyle = {
    color: "#e2e8f0",
    fontSize: "12px",
    fontWeight: "500",
    letterSpacing: "0.3px",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        zIndex: 100,
        position: "relative",
      }}
    >
      {/* 🎙️ Mic Control */}
      <div style={wrapperStyle}>
        <button
          onClick={toggleMic}
          style={{
            ...btnStyle,
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: isMuted ? "#ef4444" : "#334155", // Red when muted, Dark slate when active
          }}
          title={isMuted ? "Turn Mic On" : "Mute Mic"}
          disabled={isProcessing}
        >
          {isMuted ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>
        <span style={labelStyle}>Mic</span>
      </div>

      {/* 📷 Camera Control */}
      <div style={wrapperStyle}>
        <button
          onClick={toggleCam}
          style={{
            ...btnStyle,
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: isCamOff ? "#ef4444" : "#334155", // Red when off, Dark slate when on
          }}
          title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
          disabled={isProcessing}
        >
          {isCamOff ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M21 17.18V7l-7 5-1.1-.79M7 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 1.71-.94" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </button>
        <span style={labelStyle}>Camera</span>
      </div>

      {/*  Screen Share Control (Rounded Square like Target UI) */}
      <div style={wrapperStyle}>
        <button
          onClick={toggleScreenShare}
          style={{
            ...btnStyle,
            width: "56px", // Thoda chouda (wider)
            height: "48px",
            borderRadius: "14px", // Rounded square
            backgroundColor: isScreenSharing ? "#22c55e" : "#3b82f6", // Green when sharing, Blue when idle
          }}
          title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          disabled={isProcessing}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>
        <span style={labelStyle}>Share Screen</span>
      </div>
    </div>
  );
};

export default CallControls;
