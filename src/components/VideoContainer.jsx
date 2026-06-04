import React from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import CallControls from './CallControls';

const VideoContainer = () => {
  const call = useCall();

  // Jab tak call instance fully initialized na ho, safe loading string render karo
  if (!call) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#9ca3af", fontSize: "12px", fontFamily: "monospace", backgroundColor: "#14141b" }}>
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
        boxSizing: "border-box"
      }}
    >
      {/* 🟢 LEFT SIDE: Horizontal Row for User Cam Cards */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          overflowX: "auto", // Sirf horizontal scroll allow hoga
          flex: 1,
          height: "100%",
          paddingTop: "5px",
          paddingBottom: "5px"
        }}
        className="styleScrollbar"
      >
        {participants.map((p) => (
          <div 
            key={p.sessionId} 
            style={{
              position: "relative",
              width: "120px",    // 🎯 Fixed Chhota Card Box Width
              height: "75px",    // 🎯 Fixed Chhota Card Box Height
              backgroundColor: "#2b2c40",
              borderRadius: "6px",
              overflow: "hidden",
              border: "2px solid #3d3e59",
              flexShrink: 0,     // Card ko shrink hone se rokega
              boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
            }}
          >
            {p.videoStream ? (
              <video 
                autoPlay 
                playsInline 
                muted={p.isLocalParticipant} 
                ref={(el) => { if (el && p.videoStream) el.srcObject = p.videoStream; }}
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover", // 🎯 Isse video phategi nahi, box ke andar fit rahegi
                  transform: p.isLocalParticipant ? "scaleX(-1)" : "none" // Mirror effect for local user
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#fff", fontSize: "12px", fontWeight: "600", bgGradient: "to bottom right", backgroundColor: "#3e3f4e" }}>
                {p.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            
            {/* Name Badge */}
            <div style={{ position: "absolute", bottom: "4px", left: "4px", backgroundColor: "rgba(0,0,0,0.6)", padding: "1px 5px", rounded: "3px", fontSize: "10px", color: "#fff", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name || 'User'}
            </div>
          </div>
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