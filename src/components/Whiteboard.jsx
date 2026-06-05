import React, { useEffect, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const Whiteboard = ({ socketRef, roomId }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!socketRef || !socketRef.current) return;
    const socket = socketRef.current;

    const handleRemoteDraw = ({ delta }) => {
      if (!editorRef.current || !delta) return;

      // 🎯 FIX 1: mergeRemoteChanges khud isko 'remote' source mark kar deta hai.
      // Toh custom ref ya setTimeout ki koi zaroorat nahi hai.
      editorRef.current.store.mergeRemoteChanges(() => {
        if (delta.added && Object.keys(delta.added).length > 0) {
          editorRef.current.store.put(Object.values(delta.added));
        }

        // 🎯 NEW FIX: Tldraw line updates ko array [old, new] me bhejta hai.
        // Yahan hum exactly updated record ko filter karke nikal rahe hain.
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

    // 🎯 FIX 2: Listen me humne 'scope: document' filter laga diya.
    // Ab sirf lines aur shapes sync hongi. Camera/mouse pointer sync nahi hoga jisse interruption ruk jayegi.
    editor.store.listen(
      (update) => {
        // Agar change kisi aur user ne bheja hai, toh wapas emit mat karo (prevents infinite loop)
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
      { scope: "document" }, // Sirf shapes track karega
    );
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
