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
  const activeFileIdRef = useRef(activeFileId);

  //  UPDATE 1: onCodeChange ko dependency cycle se bachane ke liye ref me store kiya
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  // Keep ref synchronized with the latest active file identifier safely
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    let currentSocket = socketRef.current;

    //  UPDATE 2: Listener ko alag function banaya taaki cleanup perfectly ho sake
    const handleRemoteCodeChange = ({ fileId, code }) => {
      //  MASTER FIX: Ab remote code tabhi editor pe chhapega jab wo current active tab ka ho
      if (
        fileId === activeFileIdRef.current &&
        code !== null &&
        code !== undefined
      ) {
        if (editorRef.current && editorRef.current.getValue() !== code) {
          //  CURSOR FIX: Naya code set karne se pehle current user ka cursor save karo
          const cursorPosition = editorRef.current.getCursor();

          editorRef.current.setValue(code); // Code update karo

          //  CURSOR FIX: Code update hone ke baad cursor ko wapas uski jagah set kar do
          editorRef.current.setCursor(cursorPosition);
        }
      }
    };

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

      // Load initial code representation bound securely to room and file scope
      const savedCode = localStorage.getItem(
        `code-${roomId}-${activeFileIdRef.current}`,
      );
      if (savedCode !== null) {
        editorRef.current.setValue(savedCode);
      } else {
        editorRef.current.setValue(fileContent || "");
      }

      // Handle user keystrokes changes operations
      editorRef.current.on("change", (instance, changes) => {
        const { origin } = changes;
        const code = instance.getValue();

        // Propagate current string snapshot to parent container state
        //  UPDATE 3: Direct function ki jagah ref ka use karke call kiya
        if (onCodeChangeRef.current) {
          onCodeChangeRef.current(code);
        }

        if (origin !== "setValue") {
          localStorage.setItem(
            `code-${roomId}-${activeFileIdRef.current}`,
            code,
          );

          //  FIX 1: Emit signature payload carries specific target file id bounds to avoid remote overlap crashes
          if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
              roomId,
              fileId: activeFileIdRef.current,
              code,
            });
          }
        }
      });

      //  FIX 2: Dynamic listener validation maps transmission payload directly to matching scoped file streams
      if (socketRef.current) {
        socketRef.current.on(ACTIONS.CODE_CHANGE, handleRemoteCodeChange);
      }
    }

    init();

    //  FIX 3: Leak-proof absolute structural unmounting isolation cleanup
    return () => {
      if (currentSocket) {
        //  UPDATE 4: Sirf is component ka listener hataya taaki dusre components break na ho
        currentSocket.off(ACTIONS.CODE_CHANGE, handleRemoteCodeChange);
      }
      if (editorRef.current) {
        editorRef.current.toTextArea();
        editorRef.current = null;
      }
    };

    // UPDATE 5: onCodeChange ko dependencies se hata diya taaki keystrokes par editor re-mount/freeze na ho
  }, [roomId, socketRef]);

  // File transition swap operational view hook loader
  useEffect(() => {
    if (editorRef.current) {
      // 1. Switch karne se pehle purana content save karo
      // activeFileIdRef.current abhi bhi purani file ki ID hold kar raha hai
      const currentCode = editorRef.current.getValue();
      localStorage.setItem(
        `code-${roomId}-${activeFileIdRef.current}`,
        currentCode,
      );

      // 2. Nayi file ka content seedha props se uthao (Kyunki parent ne file array already sync kar diya hai)
      const contentToLoad = fileContent || "";

      // 3. Editor update karo
      if (editorRef.current.getValue() !== contentToLoad) {
        editorRef.current.setValue(contentToLoad);
      }

      // 4. Ref update karo (taaki agle switch ke liye ye purani ban jaye)
      activeFileIdRef.current = activeFileId;
    }
  }, [activeFileId, roomId, fileContent]); //  MASTER FIX: fileContent dependency is strictly required here

  // FIX 4: Yeh function editor ke andar dabaaye gaye Spacebar keyboard click ko global browser tak pahuche se strictly BLOCK karega!
  const handleEditorKeyDown = (e) => {
    if (e.key === " " || e.keyCode === 32) {
      e.stopPropagation(); // Stream SDK ko trigger karne se rokega 🛑
    }
  };

  return (
    <div
      onKeyDown={handleEditorKeyDown}
      style={{ height: "100%", width: "100%" }}
    >
      <textarea id="realtimeEditor"></textarea>
    </div>
  );
};

export default Editor;
