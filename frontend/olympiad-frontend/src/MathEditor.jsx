import React, { useState, useRef } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

const MathEditor = ({ isOpen, onClose, onInsert, initialValue = "" }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [mathInput, setMathInput] = useState(initialValue || "$");
  const textareaRef = useRef(null);

  const symbolCategories = {
    basic: {
      name: 'Basic',
      symbols: [
        { symbol: '+', latex: '+' },
        { symbol: '-', latex: '-' },
        { symbol: '×', latex: '\\times' },
        { symbol: '÷', latex: '\\div' },
        { symbol: '=', latex: '=' },
        { symbol: '≠', latex: '\\neq' },
        { symbol: '<', latex: '<' },
        { symbol: '>', latex: '>' },
        { symbol: '≤', latex: '\\leq' },
        { symbol: '≥', latex: '\\geq' },
        { symbol: '±', latex: '\\pm' },
        { symbol: '∓', latex: '\\mp' },
        { symbol: '∞', latex: '\\infty' },
        { symbol: '∅', latex: '\\emptyset' }
      ]
    },
    powers: {
      name: 'Powers',
      symbols: [
        { symbol: 'x²', latex: 'x^2' },
        { symbol: 'x³', latex: 'x^3' },
        { symbol: 'xⁿ', latex: 'x^n' },
        { symbol: '√', latex: '\\sqrt{}', template: true },
        { symbol: '∛', latex: '\\sqrt[3]{}', template: true },
        { symbol: 'x₁', latex: 'x_1' },
        { symbol: 'x₂', latex: 'x_2' }
      ]
    },
    greek: {
      name: 'Greek',
      symbols: [
        { symbol: 'α', latex: '\\alpha' },
        { symbol: 'β', latex: '\\beta' },
        { symbol: 'γ', latex: '\\gamma' },
        { symbol: 'δ', latex: '\\delta' },
        { symbol: 'ε', latex: '\\varepsilon' },
        { symbol: 'λ', latex: '\\lambda' },
        { symbol: 'μ', latex: '\\mu' },
        { symbol: 'π', latex: '\\pi' },
        { symbol: 'σ', latex: '\\sigma' },
        { symbol: 'θ', latex: '\\theta' },
        { symbol: 'ω', latex: '\\omega' }
      ]
    },
    functions: {
      name: 'Functions',
      symbols: [
        { symbol: 'sin', latex: '\\sin' },
        { symbol: 'cos', latex: '\\cos' },
        { symbol: 'tan', latex: '\\tan' },
        { symbol: 'log', latex: '\\log' },
        { symbol: 'ln', latex: '\\ln' },
        { symbol: 'exp', latex: '\\exp' },
        { symbol: '∑', latex: '\\sum' },
        { symbol: '∏', latex: '\\prod' }
      ]
    }
  };

  const insertSymbol = (symbolData) => {
    const { latex, template } = symbolData;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = mathInput;

    let newText;
    if (template) {
      newText = text.substring(0, start) + latex + text.substring(end);
      setMathInput(newText);

      setTimeout(() => {
        const newPosition = start + latex.indexOf('{}') + 1;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    } else {
      newText = text.substring(0, start) + latex + text.substring(end);
      setMathInput(newText);

      setTimeout(() => {
        const newPosition = start + latex.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  const handleInsert = () => {
    let finalInput = mathInput.trim();
    // Ensure it starts with $ and ends with $
    if (!finalInput.startsWith('$')) finalInput = '$' + finalInput;
    if (!finalInput.endsWith('$')) finalInput += '$';

    onInsert(finalInput);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="math-editor-overlay">
      <div className="math-editor">
        <div className="math-editor-header">
          <h3>Math Editor</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="math-toolbar">
          <div className="toolbar-tabs">
            {Object.entries(symbolCategories).map(([key, category]) => (
              <button
                key={key}
                className={activeTab === key ? 'active' : ''}
                onClick={() => setActiveTab(key)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="symbol-grid">
            {symbolCategories[activeTab].symbols.map((symbolData, index) => (
              <button
                key={index}
                className="symbol-btn"
                onClick={() => insertSymbol(symbolData)}
                title={symbolData.latex}
              >
                {symbolData.symbol}
              </button>
            ))}
          </div>
        </div>

        <div className="math-input-area">
          <div className="input-section">
            <label>LaTeX Input:</label>
            <textarea
              ref={textareaRef}
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              placeholder="Type LaTeX or click symbols above..."
              className="math-textarea"
            />
          </div>

          <div className="preview-section">
            <label>Preview:</label>
            <div className="math-preview">
              {mathInput ? (
                <InlineMath math={mathInput.replace(/\$/g, '')} />
              ) : (
                <div className="preview-placeholder">Math preview will appear here...</div>
              )}
            </div>
          </div>
        </div>

        <div className="math-actions">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleInsert} className="insert-btn">Insert Symbols</button>
        </div>
      </div>
    </div>
  );
};

export default MathEditor;
