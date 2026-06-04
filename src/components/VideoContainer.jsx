import React from "react";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";
import CallControls from "./CallControls";

const VideoContainer = () => {
  const call = useCall();

  // Jab tak call instance fully initialized na ho, safe loading string render karo
  if (!call) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#9ca3af",
          fontSize: "12px",
          fontFamily: "monospace",
          backgroundColor: "#14141b",
        }}
      >
        ⚡ Initializing secure stream connection channel...
      </div>
    );
  }

  return <VideoContainerContent />;
};

const VideoContainerContent = () => {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "0 20px",
        backgroundColor: "#14141b",
        boxSizing: "border-box",
      }}
    >
      {/* 🟢 LEFT SIDE: Horizontal Row for User Cam Cards & Screen Shares */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          overflowX: "auto", // Sirf horizontal scroll allow hoga
          flex: 1,
          height: "100%",
          paddingTop: "5px",
          paddingBottom: "5px",
        }}
        className="styleScrollbar"
      >
        {participants.map((p) => (
          <React.Fragment key={p.sessionId}>
            {/* 1. REGULAR CAMERA CARD */}
            <div
              style={{
                position: "relative",
                width: "120px",
                height: "75px",
                backgroundColor: "#2b2c40",
                borderRadius: "6px",
                overflow: "hidden",
                border: "2px solid #3d3e59",
                flexShrink: 0,
                boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
              }}
            >
              {p.videoStream ? (
                <video
                  autoPlay
                  playsInline
                  muted={p.isLocalParticipant}
                  ref={(el) => {
                    if (el && p.videoStream) el.srcObject = p.videoStream;
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: p.isLocalParticipant ? "scaleX(-1)" : "none",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    height: "100%",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: "600",
                    backgroundColor: "#3e3f4e",
                  }}
                >
                  {p.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              {/* Name Badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  left: "4px",
                  backgroundColor: "rgba(0,0,0,0.6)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                  fontSize: "10px",
                  color: "#fff",
                  maxWidth: "80%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.name || "User"}
              </div>
            </div>

            {/* 2. 🎯 NEW: SCREEN SHARE CARD (Ab sirf tumhara local screen share bottom me dikhega) */}
            {p.screenShareStream && p.isLocalParticipant && (
              <div
                style={{
                  position: "relative",
                  width: "180px",
                  height: "75px",
                  backgroundColor: "#1c1c27",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "2px solid #3b82f6",
                  flexShrink: 0,
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)",
                }}
              >
                <video
                  autoPlay
                  playsInline
                  muted={true}
                  ref={(el) => {
                    if (el && p.screenShareStream)
                      el.srcObject = p.screenShareStream;
                  }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />

                {/* Screen Share Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    backgroundColor: "#3b82f6",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "9px",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  Your Screen (Sharing)
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 🔵 RIGHT SIDE: Media Control Operations Panel */}
      <div style={{ flexShrink: 0, marginLeft: "20px" }}>
        <CallControls />
      </div>
    </div>
  );
};

export default VideoContainer;
