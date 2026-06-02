import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";

const Editor = ({
  socketRef,
  roomId,
  onCodeChange,
  activeFileId,
  fileContent,
}) => {
  const editorRef = useRef(null);

  // 📝 MASTER FIX REF: Yeh ref hamesha bina loop bnae ekdam fresh activeFileId track karega
  const activeFileIdRef = useRef(activeFileId);

  // Jab bhi activeFileId badle, ref ko turant update karo
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    async function init() {
      editorRef.current = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "dracula",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
        },
      );

      // Pehli baar load hone par code load karo
      const savedCode = localStorage.getItem(
        `code-${roomId}-${activeFileIdRef.current}`,
      );
      if (savedCode !== null) {
        editorRef.current.setValue(savedCode);
      } else {
        editorRef.current.setValue(fileContent || "");
      }

      // Jb user type karega
      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();

        // Parent state ko update karo
        onCodeChange(code);

        // State update hone ka wait nahi karenge, direct Ref se hamesha CURRENT file ID nikalenge
        if (origin !== "setValue") {
          localStorage.setItem(
            `code-${roomId}-${activeFileIdRef.current}`,
            code,
          );

          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });
          }
        }
      });

      // Socket listener for syncing code
      if (socketRef.current) {
        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (code !== null && code !== undefined) {
            if (editorRef.current.getValue() !== code) {
              editorRef.current.setValue(code);
            }
          }
        });
      }
    }

    init();

    // Cleanup
    return () => {
      socketRef.current?.off(ACTIONS.CODE_CHANGE);
      if (editorRef.current) {
        editorRef.current.toTextArea();
      }
    };
  }, []); // Yeh hook sirf ek baar chlega aur mast chalega

  // Jab bhi file badlegi, yeh purana code uraye bina fresh load karega
  useEffect(() => {
    if (editorRef.current) {
      const savedCode = localStorage.getItem(`code-${roomId}-${activeFileId}`);

      if (savedCode !== null) {
        if (editorRef.current.getValue() !== savedCode) {
          editorRef.current.setValue(savedCode);
        }
      } else {
        if (editorRef.current.getValue() !== fileContent) {
          editorRef.current.setValue(fileContent || "");
        }
      }
    }
  }, [activeFileId, roomId]);

  return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
