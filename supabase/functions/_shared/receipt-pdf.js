import { templateBase64 } from './receipt-assets/template.js';
import { latinFontBase64 } from './receipt-assets/latin-font.js';
export function receiptRenderer({ PDFDocument, StandardFonts, rgb, fontkit, loadUnicodeFont }) {
  return async data => {
    if(data.terms_version!=='2026-09-15') throw new Error('unsupported_terms_version');
    const doc = await PDFDocument.load(templateBase64,{updateMetadata:false});
    const page=doc.getPages()[0], W=page.getWidth(), H=page.getHeight(), right=W-38;
    const ink=rgb(56/255,47/255,41/255), brown=rgb(109/255,90/255,78/255);
    // Resolve a variable font before subsetting; unresolved variation glyphs
    // otherwise disappear in some PDF viewers.
    doc.registerFontkit({create:bytes=>{const parsed=fontkit.create(bytes);return parsed.variationAxes?.wght?parsed.getVariation({wght:400}):parsed;}});
    const font=await doc.embedFont(latinFontBase64,{subset:true});
    const name=String(data.client_name).replace(/[\r\n\t]/g,' '), email=String(data.email).replace(/[\r\n\t]/g,' ');
    const codepoints=new Set(font.getCharacterSet());
    const requiresUnicode=[...name+email+data.package_name].some(c=>!codepoints.has(c.codePointAt(0)));
    const unicodeFont=requiresUnicode?await doc.embedFont(await loadUnicodeFont(),{subset:true}):null;
    const text=(value,x,top,size=10,width=240,align='left')=>{
      value=String(value);const usedFont=unicodeFont&&[...value].some(c=>!codepoints.has(c.codePointAt(0)))?unicodeFont:font;
      const actual=Math.min(size,width/usedFont.widthOfTextAtSize(value,1));
      page.drawText(value,{font:usedFont,size:actual,color:brown,x:align==='right'?x-usedFont.widthOfTextAtSize(value,actual):x,y:H-top-size});
    };
    text(name,38,120,12,276);text(email,38,140,8.5,276);
    text(data.receipt_number,right,105,8.8,155,'right');
    const date = new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(data.paid_at))+' HKT';
    text(date,right,121,8.8,155,'right');text(data.payment_method,right,137,8.8,140,'right');
    text(`${data.package_name} - ${data.format}`,50,188,13,255);
    text(data.credits,342,191,9.7,55);
    const amount = new Intl.NumberFormat('en-HK',{minimumFractionDigits:2,maximumFractionDigits:2}).format(data.amount_hkd);
    text(amount,right-12,191,10,120,'right');
    text(`Validity: ${data.validity_months} month${data.validity_months===1?'':'s'} from the first booked class.`,50,208,8.5,480);
    text(`HK$${amount}`,right-12,232,20,300,'right');
    if(!data.livemode) text('TEST PAYMENT - NOT VALID FOR ACCOUNTING',right,72,7.5,250,'right');
    doc.setTitle(`Official Receipt ${data.receipt_number}`);doc.setAuthor('Senses Studio');
    doc.setSubject('Payment receipt with package terms, version 15 September 2026');
    const issued=new Date(data.paid_at);doc.setCreationDate(issued);doc.setModificationDate(issued);
    return doc.save({useObjectStreams:false});
  };
}
