import React, { useEffect, useState, useRef, useCallback } from "react";
import { Excalidraw, getSceneVersion } from "@excalidraw/excalidraw";

const Whiteboard = ({ socketRef, roomId }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  const lastSceneVersionRef = useRef(0);
  const isRemoteUpdateRef = useRef(false);
  const throttleTimeoutRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socketRef || !socketRef.current || !excalidrawAPI) return;
    const socket = socketRef.current;
    const handleRemoteDraw = ({ delta }) => {
      if (!delta || delta.length === 0) return;
      isRemoteUpdateRef.current = true;
      excalidrawAPI.updateScene({ elements: delta });
      lastSceneVersionRef.current = getSceneVersion(delta);
    };
    socket.on("whiteboard_draw_remote", handleRemoteDraw);
    return () => socket.off("whiteboard_draw_remote", handleRemoteDraw);
  }, [socketRef, excalidrawAPI]);

  const handleChange = (elements) => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    const currentVersion = getSceneVersion(elements);
    if (currentVersion > lastSceneVersionRef.current) {
      lastSceneVersionRef.current = currentVersion;
      if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = setTimeout(
        () => throttledEmit(elements),
        100,
      );
    }
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden", // Ye icons ko bahar jane se rokega
      }}
    >
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        onChange={handleChange}
        theme="light"
      />
    </div>
  );
};

export default Whiteboard;
