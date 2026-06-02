import React from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const Whiteboard = () => {
  return (
    <div
      className="whiteboard-container"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      {/* 🚀 Tldraw ka canvas auto dark-mode support ke sath */}
      <Tldraw inferDarkMode />
    </div>
  );
};

export default Whiteboard;
