import React, { useState } from "react";
import { useCall } from "@stream-io/video-react-sdk";

const CallControls = () => {
  const call = useCall();

  // 🎯 INITIALIZING AS TRUE: Kyunki join time par hamare streams disabled (OFF) hain
  const [isMuted, setIsMuted] = useState(true);
  const [isCamOff, setIsCamOff] = useState(true);

  if (!call) return null;

  const toggleMic = async () => {
    try {
      if (isMuted) {
        await call.microphone.enable();
      } else {
        await call.microphone.disable();
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error("Mic toggle crash block handled:", err);
    }
  };

  const toggleCam = async () => {
    try {
      if (isCamOff) {
        await call.camera.enable();
      } else {
        await call.camera.disable();
      }
      setIsCamOff(!isCamOff);
    } catch (err) {
      console.error("Camera toggle crash block handled:", err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        backgroundColor: "#1c1c27",
        padding: "8px 18px",
        borderRadius: "30px",
        border: "1px solid #32324d",
        boxSizing: "border-box",
        zIndex: 100, // 🎯 FIX: Hamesha top render hoga, background me hide nahi hoga
        position: "relative",
      }}
    >
      {/* Mic Toggle Button */}
      <button
        onClick={toggleMic}
        style={{
          backgroundColor: isMuted ? "#ef4444" : "#22c55e", // Red when muted, Green when active 🟢
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          transition: "background-color 0.2s ease",
        }}
        title={isMuted ? "Turn Mic On" : "Mute Mic"}
      >
        {isMuted ? "🎙️❌" : "🎙️"}
      </button>

      {/* Camera Toggle Button */}
      <button
        onClick={toggleCam}
        style={{
          backgroundColor: isCamOff ? "#ef4444" : "#22c55e", // Red when camera off, Green when on 🎥
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          cursor: "pointer",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          transition: "background-color 0.2s ease",
        }}
        title={isCamOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCamOff ? "📷❌" : "📷"}
      </button>
    </div>
  );
};

export default CallControls;
