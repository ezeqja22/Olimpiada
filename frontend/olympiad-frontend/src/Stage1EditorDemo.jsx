import React, { useState } from "react";
import VisualMathEditor from "./components/VisualMathEditor";

/** Temporary, local-only editor demonstration for the Stage 1 draft PR. */
export default function Stage1EditorDemo() {
  const [description, setDescription] = useState(
    "Gjeni të gjithë numrat e plotë $x$ që plotësojnë $x^2 - 5x + 6 = 0$."
  );

  return (
    <main style={{
      boxSizing: "border-box", minHeight: "100vh", padding: "40px 16px",
      background: "#f2f7f4", color: "#193e31", fontFamily: "system-ui, sans-serif",
    }}>
      <section style={{
        maxWidth: 880, margin: "0 auto", padding: "clamp(20px, 4vw, 40px)",
        background: "#fff", border: "1px solid #d9e8de", borderRadius: 20,
        boxShadow: "0 12px 40px rgba(19, 68, 48, 0.08)",
      }}>
        <p style={{ color: "#337e60", fontWeight: 700, margin: "0 0 8px" }}>
          Olimpiada · Stage 1 preview
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "clamp(24px, 4vw, 34px)" }}>
          Provo editorin matematikor
        </h1>
        <p style={{ lineHeight: 1.6, margin: "0 0 24px" }}>
          Shkruaj tekst, shto simbole dhe formula me butonat më poshtë.
          Kjo faqe është vetëm për testim: nuk kërkon llogari dhe nuk ruan asgjë.
        </p>

        <VisualMathEditor
          value={description}
          onChange={setDescription}
          placeholder="Shkruaj këtu..."
          minHeight={220}
        />

        <h2 style={{ margin: "28px 0 8px", fontSize: 18 }}>Teksti që do të ruhej</h2>
        <pre style={{
          whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: 16,
          background: "#f4f8f5", border: "1px solid #d9e8de", borderRadius: 10,
          fontSize: 14, lineHeight: 1.6,
        }}>{description || "(bosh)"}</pre>
        <p style={{ color: "#587165", fontSize: 13, margin: "16px 0 0" }}>
          Demo e përkohshme në branch-in e testimit. Nuk dërgon kërkesa në API.
        </p>
      </section>
    </main>
  );
}
