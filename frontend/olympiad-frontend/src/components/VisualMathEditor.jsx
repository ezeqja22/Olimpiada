import React,{useEffect,useRef,useState} from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "../phase1.css";
import "../visualMath.css";

/** Rich visual formula chips; onChange emits text with $...$ LaTeX for existing backend. */
export default function VisualMathEditor({value="",onChange,placeholder="Shkruaj këtu problemin...",minHeight=170}){
 const editor=useRef(null);
 const [mode,setMode]=useState("");
 const [a,setA]=useState("a"),[b,setB]=useState("b");
 const [error,setError]=useState("");
 const createChip=(latex)=>{
   const span=document.createElement("span");
   span.className="vme-formula";
   span.contentEditable="false";
   span.dataset.math=latex;
   span.title="Kliko dy herë për të fshirë formulën";
   span.innerHTML=katex.renderToString(latex,{throwOnError:false,trust:false,output:"html"});
   return span;
 };
 const serialize=()=>{
   const walk=(node)=>{
     if(node.nodeType===3)return node.textContent;
     if(node.nodeType!==1)return "";
     if(node.dataset?.math)return "$"+node.dataset.math+"$";
     if(node.tagName==="BR")return "\n";
     const inner=[...node.childNodes].map(walk).join("");
     if(node.tagName==="DIV"||node.tagName==="P")return inner+"\n";
     return inner;
   };
   return [...(editor.current?.childNodes||[])].map(walk).join("").replace(/\n+$/,"");
 };
 useEffect(()=>{
   const root=editor.current;if(!root||serialize()===value)return;
   root.replaceChildren();
   const sections=String(value||"").split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$)/g);
   sections.forEach(part=>{
     if((part.startsWith("$$")&&part.endsWith("$$"))||(part.startsWith("$")&&part.endsWith("$"))){
       root.appendChild(createChip(part.replace(/^\$\$?|\$\$?$/g,"")));
     } else if(part){
       const lines=part.split("\n");
       lines.forEach((line,index)=>{if(index)root.appendChild(document.createElement("br"));root.appendChild(document.createTextNode(line));});
     }
   });
 },[value]);
 const insert=(latex)=>{
   try{
     katex.renderToString(latex,{throwOnError:true,trust:false});
     const root=editor.current,chip=createChip(latex);
     const selection=window.getSelection();
     const range=selection?.rangeCount?selection.getRangeAt(0):null;
     if(range&&root.contains(range.commonAncestorContainer)){
       range.deleteContents();range.insertNode(chip);
       range.setStartAfter(chip);range.collapse(true);
       selection.removeAllRanges();selection.addRange(range);
     }else root.appendChild(chip);
     root.focus();onChange(serialize());setMode("");setError("");
   }catch(e){setError("Formula nuk është e vlefshme. Kontrollo vlerat.")}
 };
 const formula=()=>{
   const x=a.trim(),y=b.trim();if(!x)return;
   // Values are escaped into plain math atoms, never execute HTML or commands.
   const clean=v=>v.replace(/[\\{}$]/g,"").slice(0,40);
   const x1=clean(x),y1=clean(y);
   if(mode==="fraction")insert("\\frac{"+x1+"}{"+(y1||"1")+"}");
   if(mode==="power")insert("{"+x1+"}^{"+(y1||"2")+"}");
   if(mode==="index")insert("{"+x1+"}_{"+(y1||"1")+"}");
   if(mode==="root")insert("\\sqrt{"+x1+"}");
   if(mode==="sum")insert("\\sum_{"+x1+"}^{"+(y1||"n")+"}");
 };
 const symbols=[["π","\\pi"],["α","\\alpha"],["β","\\beta"],["θ","\\theta"],["∞","\\infty"],["≤","\\leq"],["≥","\\geq"],["≠","\\neq"],["×","\\times"],["∈","\\in"],["√","\\sqrt{x}"],["∑","\\sum"],["ℝ","\\mathbb{R}"]];
 return <div className="vme">
  <div className="vme-toolbar">
    {symbols.map(([symbol,latex])=><button key={latex} type="button" title={symbol} onMouseDown={e=>e.preventDefault()} onClick={()=>insert(latex)}>{symbol}</button>)}
    {[["fraction","Thyesë a/b"],["power","Fuqi"],["index","Indeks"],["root","Rrënjë"],["sum","Shumë"]].map(([id,label])=><button key={id} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>setMode(mode===id?"":id)}>{label}</button>)}
  </div>
  {mode&&<div className="vme-formula-tool">
     <label>{mode==="root"?"Nën rrënjë":"Vlera e parë"}<input className="p1-input" value={a} onChange={e=>setA(e.target.value)} /></label>
     {mode!=="root"&&<label>{mode==="fraction"?"Emëruesi":mode==="power"?"Eksponenti":mode==="index"?"Indeksi":"Kufiri sipër"}<input className="p1-input" value={b} onChange={e=>setB(e.target.value)}/></label>}
     <button type="button" className="p1-btn" onMouseDown={e=>e.preventDefault()} onClick={formula}>Shto formulën</button>
   </div>}
  <div ref={editor} className="vme-canvas" contentEditable role="textbox" aria-label="Editor vizual matematikor" aria-multiline="true"
     data-placeholder={placeholder} style={{minHeight}} suppressContentEditableWarning
     onInput={()=>onChange(serialize())}
     onDoubleClick={e=>{const chip=e.target.closest("[data-math]");if(chip&&editor.current.contains(chip)){chip.remove();onChange(serialize());}}}
     onPaste={e=>{e.preventDefault();const text=e.clipboardData.getData("text/plain");document.execCommand("insertText",false,text);}} />
  <p className="p1-muted" style={{margin:"5px 0 0"}}>Shkruaj normalisht dhe kliko simbolet për formula. LaTeX ruhet automatikisht; nuk ke nevojë ta shkruash. Kliko dy herë mbi formulë për ta hequr.</p>
  {error&&<p className="p1-alert">{error}</p>}
 </div>;
}
