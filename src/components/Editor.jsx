import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { dracula } from "@uiw/codemirror-theme-dracula";

const Editor = () => {
  const [value, setValue] = useState("// start coding...");

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <CodeMirror
        value={value}
        height="500px"
        theme={dracula}
        extensions={[javascript()]}
        onChange={(val) => setValue(val)}
      />
    </div>
  );
};

export default Editor;
