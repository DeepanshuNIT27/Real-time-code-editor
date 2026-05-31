import React, { useEffect, useRef } from "react";
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import ACTIONS from "../Actions";

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);

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

      // saved code load karo
      const savedCode = localStorage.getItem(`code-${roomId}`);
      if (savedCode) {
        editorRef.current.setValue(savedCode);
      }

      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();

        onCodeChange(code);
        localStorage.setItem(`code-${roomId}`, code); //  save karo

        // Avoiding infinite loop while syncing code
        if (origin !== "setValue") {
          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              code,
            });
          }
        }
      });

      //  CODE_CHANGE listener — editor init hone ke BAAD
      if (socketRef.current) {
        socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
          if (code !== null && code !== undefined) {
            editorRef.current.setValue(code);
          }
        });
      }
    }

    init();



    //  Cleanup
    return () => {
      socketRef.current?.off(ACTIONS.CODE_CHANGE);
      if (editorRef.current) {
        editorRef.current.toTextArea();
      }
    };
  }, []);

  return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
