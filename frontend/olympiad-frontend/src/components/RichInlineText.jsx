import React from "react";
import { Link } from "react-router-dom";

/**
 * Safely render lightweight editor syntax without injecting HTML:
 * [label](/route), [label](https://site), **bold**, and `inline code`.
 * Legacy http://localhost:5174 links are mapped to in-app routes.
 */
function destination(href) {
  const value = String(href || "").trim();
  if (value.startsWith("/") && !value.startsWith("//")) return { internal: value };
  try {
    const url = new URL(value);
    if (["localhost", "127.0.0.1"].includes(url.hostname) &&
        ["http:", "https:"].includes(url.protocol)) {
      return { internal: url.pathname + url.search + url.hash };
    }
    if (url.protocol === "https:") return { external: url.href };
  } catch (_) { /* Invalid links are displayed as ordinary text. */ }
  return null;
}

export function RichInlineText({ text }) {
  const source = String(text ?? "");
  const syntax = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  const result = [];
  let last = 0;
  let match;
  while ((match = syntax.exec(source)) !== null) {
    if (match.index > last) result.push(source.slice(last, match.index));
    const key = match.index;
    if (match[1] !== undefined) {
      const link = destination(match[2]);
      if (link?.internal) {
        result.push(<Link key={key} to={link.internal}>{match[1]}</Link>);
      } else if (link?.external) {
        result.push(<a key={key} href={link.external} target="_blank" rel="noopener noreferrer">{match[1]}</a>);
      } else {
        result.push(match[1]);
      }
    } else if (match[3] !== undefined) {
      result.push(<strong key={key}>{match[3]}</strong>);
    } else {
      result.push(<code key={key}>{match[4]}</code>);
    }
    last = syntax.lastIndex;
  }
  if (last < source.length) result.push(source.slice(last));
  return <>{result}</>;
}

export default RichInlineText;
