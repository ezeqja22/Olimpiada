import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "../visualMath.css";

/**
 * A visual math toolbar that stores the same $...$ LaTeX text accepted by
 * the existing problem and forum APIs. It does not require new backend code.
 */
export default function VisualMathEditor({
  value = "",
  onChange,
  placeholder = "Shkruaj këtu problemin...",
  minHeight = 170,
}) {
  const editor = useRef(null);
  const [mode, setMode] = useState("");
  const [first, setFirst] = useState("a");
  const [second, setSecond] = useState("b");
  const [error, setError] = useState("");

  const createChip = (latex) => {
    const chip = document.createElement("span");
    chip.className = "vme-formula";
    chip.contentEditable = "false";
    chip.dataset.math = latex;
    chip.title = "Kliko dy herë për të fshirë formulën";
    chip.innerHTML = katex.renderToString(latex, {
      throwOnError: false,
      trust: false,
      output: "html",
    });
    return chip;
  };

  const serialize = () => {
    const walk = (node) => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return "";
      if (node.dataset?.math) return `$${node.dataset.math}$`;
      if (node.tagName === "BR") return "\n";
      const content = [...node.childNodes].map(walk).join("");
      return node.tagName === "DIV" || node.tagName === "P"
        ? `${content}\n`
        : content;
    };
    return [...(editor.current?.childNodes || [])]
      .map(walk)
      .join("")
      .replace(/\n+$/, "");
  };

  useEffect(() => {
    const root = editor.current;
    if (!root || serialize() === value) return;
    root.replaceChildren();
    String(value || "")
      .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g)
      .forEach((part) => {
        if (
          (part.startsWith("$$") && part.endsWith("$$")) ||
          (part.startsWith("$") && part.endsWith("$"))
        ) {
          root.appendChild(createChip(part.replace(/^\$\$?|\$\$?$/g, "")));
          return;
        }
        part.split("\n").forEach((line, index) => {
          if (index) root.appendChild(document.createElement("br"));
          if (line) root.appendChild(document.createTextNode(line));
        });
      });
  }, [value]);

  const insert = (latex) => {
    try {
      katex.renderToString(latex, { throwOnError: true, trust: false });
      const root = editor.current;
      const chip = createChip(latex);
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (range && root.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        range.insertNode(chip);
        range.setStartAfter(chip);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        root.appendChild(chip);
      }
      root.focus();
      onChange(serialize());
      setMode("");
      setError("");
    } catch {
      setError("Formula nuk është e vlefshme. Kontrollo vlerat.");
    }
  };

  const insertFormula = () => {
    const clean = (text) => text.trim().replace(/[\\{}$]/g, "").slice(0, 40);
    const a = clean(first);
    const b = clean(second);
    if (!a) return;
    const formulas = {
      fraction: `\\frac{${a}}{${b || "1"}}`,
      power: `{${a}}^{${b || "2"}}`,
      index: `{${a}}_{${b || "1"}}`,
      root: `\\sqrt{${a}}`,
      sum: `\\sum_{${a}}^{${b || "n"}}`,
    };
    if (formulas[mode]) insert(formulas[mode]);
  };

  const symbols = [
    ["π", "\\pi"], ["α", "\\alpha"], ["β", "\\beta"],
    ["θ", "\\theta"], ["∞", "\\infty"], ["≤", "\\leq"],
    ["≥", "\\geq"], ["≠", "\\neq"], ["×", "\\times"],
    ["∈", "\\in"], ["√", "\\sqrt{x}"], ["∑", "\\sum"],
    ["ℝ", "\\mathbb{R}"],
  ];

  return (
    <div className="vme">
      <div className="vme-toolbar" aria-label="Simbolet matematikore">
        {symbols.map(([symbol, latex]) => (
          <button key={latex} type="button" title={symbol}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(latex)}>{symbol}</button>
        ))}
        {[
          ["fraction", "Thyesë a/b"], ["power", "Fuqi"],
          ["index", "Indeks"], ["root", "Rrënjë"], ["sum", "Shumë"],
        ].map(([id, label]) => (
          <button key={id} type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setMode(mode === id ? "" : id)}>{label}</button>
        ))}
      </div>
      {mode && (
        <div className="vme-formula-tool">
          <label>{mode === "root" ? "Nën rrënjë" : "Vlera e parë"}
            <input value={first} onChange={(event) => setFirst(event.target.value)} />
          </label>
          {mode !== "root" && (
            <label>{mode === "fraction" ? "Emëruesi" : mode === "power" ? "Eksponenti" : mode === "index" ? "Indeksi" : "Kufiri sipër"}
              <input value={second} onChange={(event) => setSecond(event.target.value)} />
            </label>
          )}
          <button type="button" className="vme-insert"
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertFormula}>Shto formulën</button>
        </div>
      )}
      <div ref={editor} className="vme-canvas" contentEditable role="textbox"
        aria-label="Editor vizual matematikor" aria-multiline="true"
        data-placeholder={placeholder} style={{ minHeight }}
        suppressContentEditableWarning
        onInput={() => onChange(serialize())}
        onDoubleClick={(event) => {
          const chip = event.target.closest("[data-math]");
          if (chip && editor.current.contains(chip)) {
            chip.remove();
            onChange(serialize());
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          const selection = window.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          const node = document.createTextNode(text);
          if (range && editor.current.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            editor.current.appendChild(node);
          }
          onChange(serialize());
        }}
      />
      <p className="vme-hint">Shkruaj normalisht dhe përdor simbolet për formula. LaTeX ruhet automatikisht; kliko dy herë mbi një formulë për ta hequr.</p>
      {error && <p className="vme-error" role="alert">{error}</p>}
    </div>
  );
}
