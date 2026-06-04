import React, { useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const Whiteboard = ({ socketRef, roomId }) => {
  const editorRef = useRef(null);
  const isRemoteChangeRef = useRef(false);

  useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    const socket = socketRef.current;

    // 🎯 FIX: Pure snapshot ki jagah delta updates handle karo
    socket.on("whiteboard_draw_remote", ({ delta }) => {
      if (!editorRef.current || !delta) return;

      isRemoteChangeRef.current = true;
      try {
        editorRef.current.store.mergeRemoteChanges(() => {
          // 1. Naye shapes
          if (delta.added)
            editorRef.current.store.put(Object.values(delta.added));
          // 2. Updated shapes (points/lines) - Yeh line sync ke liye critical hai
          if (delta.updated)
            editorRef.current.store.put(
              Object.values(delta.updated).map((u) => u.to),
            );
          // 3. Removed shapes
          if (delta.removed)
            editorRef.current.store.remove(Object.keys(delta.removed));
        });
      } catch (err) {
        console.error("Delta merge error:", err);
      } finally {
        setTimeout(() => (isRemoteChangeRef.current = false), 20);
      }
    });

    return () => socket.off("whiteboard_draw_remote");
  }, [socketRef]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    editor.store.listen((update) => {
      if (isRemoteChangeRef.current) return;

      // 🎯 FIX: Snapshot ki jagah changes.added/updated/removed bhej rahe hain
      const { added, updated, removed } = update.changes;
      const hasChanges =
        Object.keys(added).length > 0 ||
        Object.keys(updated).length > 0 ||
        Object.keys(removed).length > 0;

      if (hasChanges && update.source === "user") {
        socketRef.current.emit("whiteboard_draw", {
          roomId,
          delta: { added, updated, removed },
        });
      }
    });
  };

  return (
    <div
      className="whiteboard-container"
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <Tldraw inferDarkMode onMount={handleMount} />
    </div>
  );
};

export default Whiteboard;
