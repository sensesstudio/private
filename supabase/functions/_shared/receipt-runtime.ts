import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { receiptRenderer } from './receipt-pdf.js';
// Loaded only for names outside the standard Latin character set. No customer data
// is sent to the font host. Immutable upstream revision and SHA-256 are pinned.
let unicodeFont: Promise<Uint8Array> | undefined;
async function loadUnicodeFont() {
  if(!unicodeFont) unicodeFont=(async()=>{
    const response=await fetch('https://raw.githubusercontent.com/google/fonts/3be1884c48c3e45b52ecc725676a08f87776373e/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf',{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error('font_unavailable');
    const bytes=new Uint8Array(await response.arrayBuffer());
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!=='864727d210d54f2537bbe23b3a839436c3992af72de9322af5270897246bd44f')throw new Error('font_integrity');
    return bytes;
  })().catch(error=>{unicodeFont=undefined;throw error;});
  return unicodeFont;
}
export const renderPdf=receiptRenderer({PDFDocument,StandardFonts,rgb,fontkit,loadUnicodeFont});
