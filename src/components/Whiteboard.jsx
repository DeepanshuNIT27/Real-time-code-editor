import React, { useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css"; // 🔥 Ye line design tootne se bachayegi!

const Whiteboard = ({ socketRef, roomId }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    const socket = socketRef.current;

    const handleRemoteDraw = ({ delta }) => {
      if (!editorRef.current || !delta) return;

      editorRef.current.store.mergeRemoteChanges(() => {
        if (delta.added && Object.keys(delta.added).length > 0) {
          editorRef.current.store.put(Object.values(delta.added));
        }

        if (delta.updated && Object.keys(delta.updated).length > 0) {
          const updatedRecords = Object.values(delta.updated).map((u) => {
            return Array.isArray(u) ? u[1] : u.to || u;
          });
          editorRef.current.store.put(updatedRecords.filter(Boolean));
        }

        if (delta.removed && Object.keys(delta.removed).length > 0) {
          editorRef.current.store.remove(Object.keys(delta.removed));
        }
      });
    };

    socket.on("whiteboard_draw_remote", handleRemoteDraw);

    return () => {
      socket.off("whiteboard_draw_remote", handleRemoteDraw);
    };
  }, [socketRef]);

  const handleMount = (editor) => {
    editorRef.current = editor;
    editor.store.listen(
      (update) => {
        if (update.source !== "user") return;

        const { added, updated, removed } = update.changes;

        const hasChanges =
          Object.keys(added).length > 0 ||
          Object.keys(updated).length > 0 ||
          Object.keys(removed).length > 0;

        if (hasChanges) {
          socketRef.current.emit("whiteboard_draw", {
            roomId,
            delta: { added, updated, removed },
          });
        }
      },
      { scope: "document" },
    );
  };

  return (
    // 🔥 Pehle blank screen aane ka reason ye div tha jiski height set nahi thi
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Tldraw inferDarkMode onMount={handleMount} />
    </div>
  );
};

export default Whiteboard;
