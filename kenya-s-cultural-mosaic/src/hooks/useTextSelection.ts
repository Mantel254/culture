// import { useEffect, useState } from "react";

// export function useTextSelection() {
//   const [selectedText, setSelectedText] = useState("");

//   useEffect(() => {
//     const handleMouseUp = () => {
//       const text = window.getSelection()?.toString();
//       if (text && text.trim().length > 0) {
//         setSelectedText(text.trim());
//       }
//     };

//     document.addEventListener("mouseup", handleMouseUp);
//     return () => document.removeEventListener("mouseup", handleMouseUp);
//   }, []);

//   return selectedText;
// }

// useTextSelection.ts
import { useEffect, useRef } from "react";

export function useTextSelection() {
  const selectedTextRef = useRef<string>("");

  useEffect(() => {
    const handler = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text) {
        selectedTextRef.current = text;
      }
    };

    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);

  return selectedTextRef;
}
