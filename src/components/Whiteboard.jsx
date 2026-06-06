import React, { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";

const Whiteboard = ({ socketRef, roomId }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // References for tracking state efficiently
  const lastSceneVersionRef = useRef(0);
  const isRemoteUpdateRef = useRef(false);
  const throttleTimeoutRef = useRef(null);

  // 🎯 THROTTLING FIX: Sending data safely to server without overload
  const throttledEmit = useCallback(
    (elements) => {
      if (!socketRef.current) return;
      socketRef.current.emit("whiteboard_draw", {
        roomId,
        delta: elements,
      });
    },
    [roomId, socketRef],
  );

  // 🎯 CLEANUP FIX: Prevents memory leaks when user closes the whiteboard
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  // Socket Listener: Receiving remote user's drawing
  useEffect(() => {
    if (!socketRef || !socketRef.current || !excalidrawAPI) return;

    const socket = socketRef.current;

    const handleRemoteDraw = ({ delta }) => {
      if (!delta || delta.length === 0) return;

      // 🎯 INFINITE LOOP FIX: Mark as remote update
      isRemoteUpdateRef.current = true;
      excalidrawAPI.updateScene({ elements: delta });

      // Update local version so we don't re-emit this change
      lastSceneVersionRef.current = getSceneVersion(delta);
    };

    socket.on("whiteboard_draw_remote", handleRemoteDraw);

    return () => {
      socket.off("whiteboard_draw_remote", handleRemoteDraw);
    };
  }, [socketRef, excalidrawAPI]);

  // Local user drawing handler
  const handleChange = (elements) => {
    // If it's a remote update, just reset the flag and ignore
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    // 🎯 CHANGE DETECTION FIX: Only process if there's a real structural change
    const currentVersion = getSceneVersion(elements);

    if (currentVersion > lastSceneVersionRef.current) {
      lastSceneVersionRef.current = currentVersion;

      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }

      // Throttle emit to ~30 FPS
      throttleTimeoutRef.current = setTimeout(() => {
        throttledEmit(elements);
      }, 30);
    }
  };

  return (
    // 🎯 UI CONTAINER FIX: Bulletproof styling to avoid huge icons
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        theme="dark"
      />
    </div>
  );
};

export default Whiteboard;
