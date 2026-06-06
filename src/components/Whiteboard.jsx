import React, { useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

const Whiteboard = ({ socketRef, roomId }) => {
  const excalidrawAPIRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const previousElementsRef = useRef([]);

  useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    const socket = socketRef.current;

    const handleRemoteDraw = ({ delta }) => {
      if (!excalidrawAPIRef.current || !delta) return;

      // 🎯 FIX: delta ab Excalidraw ke elements ka array hai (Backend same rahega)
      isUpdatingRef.current = true;
      excalidrawAPIRef.current.updateScene({
        elements: delta,
      });

      // Remote update apply hone ke baad flag reset kar do
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 50);
    };

    socket.on("whiteboard_draw_remote", handleRemoteDraw);

    return () => {
      socket.off("whiteboard_draw_remote", handleRemoteDraw);
    };
  }, [socketRef]);

  const handleChange = (elements, appState) => {
    // Agar change kisi aur user ne bheja hai, toh wapas emit mat karo (prevents infinite loop)
    if (isUpdatingRef.current) return;

    // 🎯 FIX: Tldraw ke 'scope: document' ki tarah, yahan hum check kar rahe hain
    // ki sirf lines aur shapes change ho, camera/zoom change hone par socket sync na ho.
    const hasChanged =
      elements.length !== previousElementsRef.current.length ||
      elements.some((el, i) => {
        const prev = previousElementsRef.current[i];
        return !prev || prev.version !== el.version;
      });

    if (hasChanged) {
      previousElementsRef.current = elements;
      socketRef.current.emit("whiteboard_draw", {
        roomId,
        delta: elements, // Backend ko pata bhi nahi chalega ki humne Tldraw hata diya hai 😎
      });
    }
  };

  return (
    <div
      className="whiteboard-container"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <Excalidraw
        excalidrawAPI={(api) => (excalidrawAPIRef.current = api)}
        onChange={handleChange}
        theme="dark" // inferDarkMode ki jagah Tldraw ka alternative
      />
    </div>
  );
};

export default Whiteboard;
