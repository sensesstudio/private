// Generate a synthetic QA sample; never use real client details in the repository.
import {writeFile} from 'node:fs/promises';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {receiptRenderer} from '../supabase/functions/_shared/receipt-pdf.js';
const render=receiptRenderer({PDFDocument,StandardFonts,rgb,fontkit,loadUnicodeFont:()=>{throw new Error('Unicode font not required for this fixture');}});
const pdf=await render({terms_version:'2026-09-15',receipt_number:'SS-2026-00000001',client_name:'Synthetic Buyer',email:'buyer@example.test',paid_at:'2026-09-18T12:15:00Z',package_name:'Trial session',format:'1:1',credits:1,amount_hkd:900,validity_months:1,payment_method:'VISA ending 4242',livemode:false});
await writeFile(process.argv[2]||'/tmp/senses-official-receipt-check.pdf',pdf);
