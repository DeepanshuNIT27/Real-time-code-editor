import React, { createContext, useContext, useState, useEffect } from "react";
import {
  StreamVideoClient,
  StreamVideo,
  StreamCall,
} from "@stream-io/video-react-sdk";

const VideoCallContext = createContext(null);

export const VideoCallProvider = ({ children, userId, userName, roomId }) => {
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [initError, setInitError] = useState(false);

  useEffect(() => {
    //  CHANGE 1: 'temp-id' validation lagayi taaki loading phase ke waqt empty stream register na ho
    if (!userId || userId === "temp-id" || !roomId) return;

    let isMounted = true;
    let activeClient = null;
    let currentCall = null;

    const initVideoCall = async () => {
      try {
        //  UPDATE 1: Localhost fallback hataya. Agar URL missing hai toh app crash hone ki jagah gracefully fail hogi.
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
        if (!BACKEND_URL) {
          throw new Error("System Error: VITE_BACKEND_URL is missing!");
        }

        const response = await fetch(`${BACKEND_URL}/api/video/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) throw new Error("Server token failed");
        const data = await response.json();

        //  UPDATE 2: Token ke sath API key ka bhi strict check lagaya taaki SDK crash na ho
        if (!data.token || !data.apiKey)
          throw new Error("Token or API Key payload missing from backend");

        activeClient = new StreamVideoClient({
          apiKey: data.apiKey,
          user: { id: userId, name: userName || userId },
          token: data.token,
        });

        currentCall = activeClient.call("default", roomId);

        await currentCall.join({
          create: true,
          options: {
            constraints: {
              audio: false,
              video: false,
            },
          },
        });

        await currentCall.microphone.disable();
        await currentCall.camera.disable();

        if (isMounted) {
          setClient(activeClient);
          setCall(currentCall);
        }
      } catch (err) {
        console.error("Stream connection failed caught safely:", err);
        if (isMounted) setInitError(true);
      }
    };

    initVideoCall();

    // CHANGE 2: Purane cleanup ko badal kar leak-proof absolute session termination lagaya hai
    return () => {
      isMounted = false;

      const cleanUpSession = async () => {
        try {
          if (currentCall) {
            // Room leave karne se pehle hardware local publishing tracks ko strictly wipe out karo
            await currentCall.camera.stopPublishing().catch(() => {});
            await currentCall.microphone.stopPublishing().catch(() => {});
            await currentCall.leave().catch(() => {});
          }
          if (activeClient) {
            await activeClient.disconnectUser().catch(() => {});
          }
        } catch (e) {
          console.error("Cleanup connection tracks leak block failed:", e);
        }
      };

      cleanUpSession();
    };
  }, [userId, roomId, userName]); // Added userName state boundary dependency tracker

  if (initError) {
    return (
      <div style={{ color: "#ef4444", fontSize: "12px", padding: "10px" }}>
        ⚠️ Video Call temporary unavailable
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#9ca3af",
          fontSize: "13px",
          fontFamily: "monospace",
          backgroundColor: "#14141b",
        }}
      >
        ⚡ Syncing secure audio-video streams...
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <VideoCallContext.Provider value={{ client, call }}>
          {children}
        </VideoCallContext.Provider>
      </StreamCall>
    </StreamVideo>
  );
};

export const useVideoCall = () => useContext(VideoCallContext);
