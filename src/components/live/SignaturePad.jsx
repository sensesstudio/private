import { useEffect, useRef, useState } from 'react';

// Strokes are kept as points normalised to the pad's box, so the drawing
// survives a resize and exports at one fixed size whatever the screen density.
const EXPORT_WIDTH = 800, EXPORT_HEIGHT = 280, INK = '#3a322c';

function drawStrokes(ctx, strokes, width, height, lineWidth) {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = lineWidth;
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
    if (stroke.length === 1) ctx.lineTo(stroke[0].x * width + 0.1, stroke[0].y * height); // a tap leaves a dot
    for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x * width, stroke[i].y * height);
    ctx.stroke();
  }
}

// Hand-drawn signature capture. onChange receives a PNG data URL after every
// completed stroke, or null once the pad is cleared.
export function SignaturePad({ onChange, label = 'Draw your signature' }) {
  const canvasRef = useRef(null), strokes = useRef([]), current = useRef(null);
  const [inked, setInked] = useState(false);
  const redraw = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStrokes(ctx, strokes.current, rect.width, rect.height, 2.2);
  };
  useEffect(() => {
    redraw();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(redraw); observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, []);
  const point = e => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const commit = () => {
    const off = document.createElement('canvas'); off.width = EXPORT_WIDTH; off.height = EXPORT_HEIGHT;
    drawStrokes(off.getContext('2d'), strokes.current, EXPORT_WIDTH, EXPORT_HEIGHT, 3);
    onChange(off.toDataURL('image/png'));
  };
  const down = e => { e.preventDefault(); canvasRef.current.setPointerCapture?.(e.pointerId); current.current = [point(e)]; strokes.current.push(current.current); redraw(); };
  const move = e => { if (!current.current) return; e.preventDefault(); current.current.push(point(e)); redraw(); };
  const up = () => { if (!current.current) return; current.current = null; setInked(true); commit(); };
  const clear = () => { strokes.current = []; current.current = null; setInked(false); redraw(); onChange(null); };
  return <div className="profile-signature">
    <canvas ref={canvasRef} className="profile-signature-pad" role="img" aria-label={label} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
    <div className="profile-signature-tools">
      <span className="profile-source">{inked ? 'Signature captured.' : 'Sign inside the box with your finger, a stylus or the mouse.'}</span>
      <button type="button" className="profile-signature-clear" onClick={clear} disabled={!inked}>Clear</button>
    </div>
  </div>;
}
