// src/MathRenderer.jsx
import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

const MathRenderer = ({ text }) => {
  if (!text) return null;

  const parts = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    const raw = match[0];

    if (raw.startsWith("$$") && raw.endsWith("$$")) {
      parts.push({
        type: "block",
        content: raw.slice(2, -2),
      });
    } else if (raw.startsWith("\\[") && raw.endsWith("\\]")) {
      parts.push({
        type: "block",
        content: raw.slice(2, -2),
      });
    } else if (raw.startsWith("\\(") && raw.endsWith("\\)")) {
      parts.push({
        type: "inline",
        content: raw.slice(2, -2),
      });
    } else if (raw.startsWith("$") && raw.endsWith("$")) {
      parts.push({
        type: "inline",
        content: raw.slice(1, -1),
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "inline") {
          return (
            <InlineMath
              key={index}
              math={part.content}
              renderError={() => <span>{`$${part.content}$`}</span>}
            />
          );
        }

        if (part.type === "block") {
          return (
            <BlockMath
              key={index}
              math={part.content}
              renderError={() => <span>{`$$${part.content}$$`}</span>}
            />
          );
        }

        return <React.Fragment key={index}>{part.content}</React.Fragment>;
      })}
    </>
  );
};

export default MathRenderer;