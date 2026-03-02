import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ejvsfdepfheohdlowuya.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqdnNmZGVwZmhlb2hkbG93dXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzIxOTUsImV4cCI6MjA4NzgwODE5NX0.3wfhO7JfigSuFiZQEZa-TVTnWLN_4Wqw4DhWRH8eqGs';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const normalizeAr = (s) => {
    if (!s) return '';
    const cleanStr = s.replace(/[\t\n\r]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return cleanStr.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
};

async function check() {
    const { data } = await supabase.from('products').select('productName');
    const dbProducts = data?.map(d => d.productName) || [];
    console.log("--------------- DB Products ---------------");
    console.log(dbProducts.map(d => `'${d}' (Normalized: '${normalizeAr(d)}')`));

    const fileBuffer = fs.readFileSync('./قالب_استيراد_الطلبات الجديد.xlsx');
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const excelData = XLSX.utils.sheet_to_json(ws);

    console.log("\n--------------- Excel Products ---------------");
    excelData.forEach(row => {
        const prod1 = row['منتج 1'] || '';
        const norm1 = normalizeAr(prod1);

        const match = dbProducts.find(p => normalizeAr(p) === norm1);
        console.log(`Excel: '${prod1}' -> Norm: '${norm1}' -> Match ? ${match ? 'YES (' + match + ')' : 'NO'}`);
    });
}

check();
