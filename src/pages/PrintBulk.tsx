import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight } from 'lucide-react';
import { ShippingLabel, injectPrintStyle } from '../components/ShippingLabel';
import { getSettings } from './Settings';
import { supabase } from '../lib/supabase';

export default function PrintBulk() {
    const [orders, setOrders] = useState<any[]>([]);
    const [companyName, setCompanyName] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const queueToPrint = localStorage.getItem('ma5zon_print_queue');
        if (queueToPrint) {
            setOrders(JSON.parse(queueToPrint));
        } else {
            navigate('/orders');
        }
        // Load company name from Supabase, fallback to localStorage
        supabase.from('settings').select('companyName').eq('id', 'main').single().then(({ data }) => {
            if (data?.companyName) setCompanyName(data.companyName);
            else setCompanyName(getSettings().companyName || '');
        });
    }, [navigate]);

    const handlePrint = () => {
        injectPrintStyle();
        window.print();
    };

    if (!orders || orders.length === 0)
        return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
            {/* Action Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link to="/orders" className="p-2 hover:bg-slate-100 transition-colors text-slate-500">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">
                            طباعة {orders.length} بوليص{orders.length === 1 ? 'ة' : 'ات'} شحن
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-5 py-2 font-bold transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" />
                        طباعة الكل
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

            {/* Labels preview container */}
            <div id="print-area" className="flex flex-col gap-6 items-center bg-slate-50/50 p-6 border border-slate-100 rounded-sm print:bg-transparent print:p-0 print:border-none">
                {orders.map((order: any) => (
                    <ShippingLabel key={order.id} order={order} companyName={companyName} />
                ))}
            </div>

            <div className="text-center text-xs text-slate-400 print:hidden">
                معاينة · {orders.length} بوليصة
            </div>
        </div>
    );
}
