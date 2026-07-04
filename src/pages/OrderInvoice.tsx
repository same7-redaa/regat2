import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ShippingLabel, injectPrintStyle } from '../components/ShippingLabel';
import { getSettings } from './Settings';

export default function OrderInvoice() {
    const { id } = useParams();
    const [order, setOrder] = useState<any>(null);
    const [companyName, setCompanyName] = useState('');

    useEffect(() => {
        if (id) {
            supabase.from('orders').select('*').eq('id', id).single().then(({ data }) => {
                if (data) setOrder(data);
            });
        }
        // Load company name from Supabase, fallback to localStorage
        supabase.from('settings').select('companyName').eq('id', 'main').single().then(({ data }) => {
            if (data?.companyName) setCompanyName(data.companyName);
            else setCompanyName(getSettings().companyName || '');
        });
    }, [id]);

    const handlePrint = () => {
        injectPrintStyle();
        window.print();
    };

    if (!order) return <div className="p-8 text-center text-slate-500">جاري التحميل أو الطلب غير موجود...</div>;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/orders" className="p-2 hover:bg-slate-100 transition-colors text-slate-500">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">بوليصة شحن — {order.id}</h1>
                        <p className="text-sm text-slate-500">{order.customerName} · {order.orderDate}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 font-bold transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        طباعة البوليصة
                    </button>
                </div>
            </div>

            {/* Print Settings Toolbar */}
            <div className="bg-slate-50 border border-slate-200 p-4 print:hidden flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center rounded-sm">
                <div className="flex items-center gap-3 flex-1">
                    <label className="text-sm font-bold text-slate-600 whitespace-nowrap">اسم الشركة على البوليصة:</label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="اسم المتجر / الشركة"
                        className="w-full px-3 py-1.5 border border-slate-300 text-sm focus:outline-none focus:border-sky-500 bg-white transition-colors text-slate-800 font-medium"
                    />
                </div>
                <div className="text-xs text-slate-400 font-medium">
                    * يتم ضبط المقاس تلقائياً ليناسب طابعتك الحرارية الموصولة بالكمبيوتر.
                </div>
            </div>

            {/* Single label – simulated live size preview */}
            <div id="print-area" className="flex justify-center bg-slate-50/50 p-6 border border-slate-100 rounded-sm">
                <ShippingLabel order={order} companyName={companyName} />
            </div>
        </div>
    );
}


