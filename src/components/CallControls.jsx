import React, { useState } from "react";
import toast from "react-hot-toast";
import { useCall, useCallStateHooks } from "@stream-io/video-react-sdk";

const CallControls = () => {
  const call = useCall();

  const [isMuted, setIsMuted] = useState(true);
  const [isCamOff, setIsCamOff] = useState(true);

  // UPDATE 1: Hardware crash aur overlapping API calls rokne ke liye processing state
  const [isProcessing, setIsProcessing] = useState(false);

  const { useHasOngoingScreenShare, useScreenShareState, useCallSettings } =
    useCallStateHooks();
  const isSomeoneScreenSharing = useHasOngoingScreenShare();
  const callSettings = useCallSettings();
  const { screenShare, optionsAwareIsMute, isTogglePending } =
    useScreenShareState();

  const amIScreenSharing = !optionsAwareIsMute;
  const isScreenSharingAllowed = callSettings?.screensharing?.enabled !== false;
  const disableScreenShareButton =
    isProcessing ||
    isTogglePending ||
    !isScreenSharingAllowed ||
    (!amIScreenSharing && isSomeoneScreenSharing);

  if (!call) return null;

  const showDevicePermissionError = (deviceName, err) => {
    const message = err?.message || "";
    const isPermissionError =
      message.includes("Permission") ||
      err?.name === "NotAllowedError" ||
      err?.name === "SecurityError";

    if (isPermissionError) {
      toast.error(
        `${deviceName} permission blocked. Allow it from browser site settings, then reload.`,
      );
      return;
    }

    toast.error(`${deviceName} could not start. Check browser console.`);
  };

  const toggleMic = async () => {
    // UPDATE 2: Agar pichli request chal rahi hai, toh naye clicks ko ignore karo
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
      showDevicePermissionError("Microphone", err);
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
      showDevicePermissionError("Camera", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleScreenShare = async () => {
    if (disableScreenShareButton) {
      if (!isScreenSharingAllowed) {
        toast.error("Screen sharing is disabled for this Stream call type.");
      } else if (!amIScreenSharing && isSomeoneScreenSharing) {
        toast.error("Someone is already sharing their screen.");
      }
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing is not supported in this browser/device.");
      return;
    }

    setIsProcessing(true);
    try {
      await screenShare.toggle();
    } catch (err) {
      console.error("Screen share toggle crash block handled:", err);
      const message = err?.message || "";
      if (
        err?.name === "NotAllowedError" ||
        message.includes("Permission") ||
        message.includes("denied")
      ) {
        toast.error("Screen share permission was denied by the browser.");
      } else {
        toast.error("Screen share could not start. Check browser console.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="callControlsContainer">
      {/* 🎙️ Mic Control */}
      <div className="controlWrapper">
        <button
          onClick={toggleMic}
          className={`controlBtn ${isMuted ? "btnRed" : "btnDark"}`}
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
        <span className="controlLabel">Mic</span>
      </div>

      {/* 📷 Camera Control */}
      <div className="controlWrapper">
        <button
          onClick={toggleCam}
          className={`controlBtn ${isCamOff ? "btnRed" : "btnDark"}`}
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
        <span className="controlLabel">Camera</span>
      </div>

      {/* 💻 Screen Share Control */}
      <div className="controlWrapper">
        <button
          onClick={toggleScreenShare}
          className={`controlBtn ${amIScreenSharing ? "btnBlueActive" : "btnBlue"}`}
          title={amIScreenSharing ? "Stop Screen Share" : "Share Screen"}
          disabled={disableScreenShareButton}
        >
          <svg
            width="22"
            height="22"
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
        <span className="controlLabel">Share Screen</span>
      </div>
    </div>
  );
};

export default CallControls;
