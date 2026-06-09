import React from "react";
import {
  useCall,
  useCallStateHooks,
  ParticipantView,
  ParticipantsAudio,
  SfuModels,
} from "@stream-io/video-react-sdk";
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
      <ParticipantsAudio participants={participants} />

      {/*  LEFT SIDE: Horizontal Row for User Cam Cards & Screen Shares */}
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
        {participants.map((p) => {
          //  EXACT FIX: SfuModels.TrackType.AUDIO use karke actual network publish track check kiya
          // Isse default cross rahega aur doosre tabs me perfectly 100% sync hoga.
          const isAudioMuted = !p.publishedTracks.includes(
            SfuModels.TrackType.AUDIO,
          );

          //  NAYA FEATURE: Check karna ki banda abhi bol raha hai ya nahi
          const isSpeaking = p.isSpeaking;
          const isScreenSharing = p.publishedTracks.includes(
            SfuModels.TrackType.SCREEN_SHARE,
          );

          return (
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
                  //  DYNAMIC BORDER: Bolne pe green glow aayega
                  border: isSpeaking
                    ? "2px solid #22c55e"
                    : "2px solid #3d3e59",
                  flexShrink: 0,
                  boxShadow: isSpeaking
                    ? "0 0 10px rgba(34, 197, 94, 0.6)"
                    : "0 2px 5px rgba(0,0,0,0.3)",
                  transition: "all 0.2s ease-in-out", // Smooth transition ke liye
                }}
              >
                <ParticipantView
                  participant={p}
                  trackType="videoTrack"
                  className="streamParticipantCard"
                  muteAudio={true}
                  ParticipantViewUI={null}
                  VideoPlaceholder={() => (
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
                />

                {/*  Mic Icon Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
                  }}
                >
                  {isAudioMuted ? (
                    // Muted Red Cross Icon
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                      <path d="M17 16.95A7 7 0 0 1 5 12H3a9 9 0 0 0 8.41 8.97v3.03h1v-3.03a8.99 8.99 0 0 0 2.82-.76"></path>
                    </svg>
                  ) : (
                    //  DYNAMIC MIC: Bol raha hai toh green, warna white
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isSpeaking ? "#22c55e" : "#e5e7eb"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="23"></line>
                      <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                  )}
                </div>

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

              {/* 2. SCREEN SHARE CARD (Ab sirf tumhara local screen share bottom me dikhega) */}
              {isScreenSharing && p.isLocalParticipant && (
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
                  <ParticipantView
                    participant={p}
                    trackType="screenShareTrack"
                    muteAudio={true}
                    className="streamParticipantCard streamScreenShareCard"
                    ParticipantViewUI={null}
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
          );
        })}
      </div>

      {/*  RIGHT SIDE: Media Control Operations Panel */}
      <div style={{ flexShrink: 0, marginLeft: "20px" }}>
        <CallControls />
      </div>
    </div>
  );
};

export default VideoContainer;
