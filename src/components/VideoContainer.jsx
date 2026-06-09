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
      <div className="videoInitializing">
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
    <div className="videoContainerContent">
      <ParticipantsAudio participants={participants} />

      {/* LEFT SIDE: Horizontal Row for User Cam Cards & Screen Shares */}
      <div className="participantsRow styleScrollbar">
        {participants.map((p) => {
          // EXACT FIX: SfuModels.TrackType.AUDIO use karke actual network publish track check kiya
          const isAudioMuted = !p.publishedTracks.includes(
            SfuModels.TrackType.AUDIO,
          );

          // NAYA FEATURE: Check karna ki banda abhi bol raha hai ya nahi
          const isSpeaking = p.isSpeaking;
          const isScreenSharing = p.publishedTracks.includes(
            SfuModels.TrackType.SCREEN_SHARE,
          );

          return (
            <React.Fragment key={p.sessionId}>
              {/* 1. REGULAR CAMERA CARD */}
              <div
                className={`participantCard ${isSpeaking ? "speakingGlow" : ""}`}
              >
                <ParticipantView
                  participant={p}
                  trackType="videoTrack"
                  className="streamParticipantCard"
                  muteAudio={true}
                  ParticipantViewUI={null}
                  VideoPlaceholder={() => (
                    <div className="videoPlaceholder">
                      {p.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                />

                {/* Mic Icon Badge */}
                <div className="micBadge">
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
                    // DYNAMIC MIC: Bol raha hai toh green, warna white
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
                <div className="nameBadge">{p.name || "User"}</div>
              </div>

              {/* 2. SCREEN SHARE CARD (Ab sirf tumhara local screen share bottom me dikhega) */}
              {isScreenSharing && p.isLocalParticipant && (
                <div className="screenShareCard">
                  <ParticipantView
                    participant={p}
                    trackType="screenShareTrack"
                    muteAudio={true}
                    className="streamParticipantCard streamScreenShareCard"
                    ParticipantViewUI={null}
                  />

                  {/* Screen Share Badge */}
                  <div className="screenShareBadge">Your Screen (Sharing)</div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* RIGHT SIDE: Media Control Operations Panel */}
      <div className="controlsWrapper">
        <CallControls />
      </div>
    </div>
  );
};

export default VideoContainer;
