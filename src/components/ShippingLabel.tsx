import React from 'react';

// ====== Shared Shipping Label – Auto-fits any thermal printer paper size ======
export const ShippingLabel: React.FC<{ order: any; companyName: string }> = ({ order, companyName }) => {
    const products = order.products || [];
    const totalQty = products.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0);

    return (
        <div 
            className="bg-white border border-slate-300 md:border-2 md:border-slate-800 flex flex-col shipping-label-card transition-all w-full max-w-[380px] aspect-[2/3] p-4 shadow-sm mx-auto justify-between text-slate-900"
            style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
            {/* Header: Company name (right) + Order ID (left) */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2">
                <div className="text-right">
                    {companyName
                        ? <div className="text-sm font-black text-slate-900 leading-tight">{companyName}</div>
                        : <div className="text-sm font-black text-slate-400 leading-tight">اسم الشركة</div>
                    }
                    <div className="text-[10px] text-slate-400 mt-0.5">بوليصة شحن</div>
                </div>
                <div className="text-left" dir="ltr">
                    <div className="font-mono font-bold text-slate-700 text-xs">{order.id}</div>
                    <div className="text-[10px] text-slate-400">{order.orderDate} {order.orderTime}</div>
                </div>
            </div>

            {/* Customer + Phone */}
            <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-300 pb-2 mt-1">
                <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">اسم العميل</div>
                    <div className="text-sm font-extrabold text-slate-900">{order.customerName || order.customer}</div>
                </div>
                <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500">الهاتف</div>
                    <div className="text-xs font-mono font-bold" dir="ltr">{order.primaryPhone}</div>
                    {order.secondaryPhone && (
                        <>
                            <div className="text-[10px] text-slate-500 mt-0.5">رقم إضافي</div>
                            <div className="text-xs font-mono text-slate-600" dir="ltr">{order.secondaryPhone}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="border-b border-dashed border-slate-300 pb-2 mt-1 flex gap-3">
                <div className="flex-shrink-0">
                    <div className="text-[10px] text-slate-500 mb-0.5">المحافظة</div>
                    <div className="text-xs font-semibold text-sky-700">{order.shipping?.locationName || '—'}</div>
                </div>
                <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-0.5">العنوان التفصيلي</div>
                    <div className="text-[11px] text-slate-700 leading-snug">{order.shipping?.detailedAddress || '—'}</div>
                </div>
            </div>

            {/* Products + Total box */}
            <div className="flex gap-2 items-stretch mt-2 flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start">
                    <div className="text-[10px] text-slate-500 mb-1">المنتجات ({totalQty} قطعة)</div>
                    <div className="space-y-0.5 overflow-y-auto max-h-[110px] pr-1">
                        {products.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-[11px] text-slate-700 truncate max-w-[150px]">{p.name}</span>
                                <span className="text-[11px] font-mono text-slate-500 mr-1">× {p.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-2 border-slate-800 p-2 text-center flex-shrink-0 flex flex-col justify-center items-center min-w-[70px]">
                    <div className="text-[10px] text-slate-500">الإجمالي</div>
                    <div className="text-base font-black text-slate-900">{order.total}</div>
                    <div className="text-[9px] text-slate-600">ج.م</div>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="border-t border-dashed border-slate-300 pt-2 mt-2">
                    <span className="text-[10px] text-slate-500">ملاحظات: </span>
                    <span className="text-[11px] text-slate-700 font-medium">{order.notes}</span>
                </div>
            )}

            {/* Signature */}
            <div className="flex justify-between items-end pt-1 mt-2 border-t border-slate-200">
                <div className="text-[8px] text-slate-400">نظام مخزون للطباعة الحرارية</div>
                <div className="text-[9px] text-slate-400 font-mono">{order.shipping?.companyName || ''}</div>
            </div>
        </div>
    );
}

// ====== Print CSS: Automatic styling to fit any thermal paper size ======
const PRINT_STYLE_ID = 'ma5zon-print-style';
export function injectPrintStyle() {
    const existing = document.getElementById(PRINT_STYLE_ID);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;

    style.innerHTML = `
        @media print {
            @page {
                size: auto; /* Let the browser/driver determine the size based on printer stock */
                margin: 0;  /* Removes browser default headers and footers */
            }
            html, body {
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            body * {
                visibility: hidden;
            }
            #print-area, #print-area * {
                visibility: visible;
            }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex;
                flex-direction: column;
                gap: 0;
            }
            .shipping-label-card {
                width: 100% !important;
                max-width: 100% !important;
                aspect-ratio: 2 / 3 !important; /* standard 4x6 label ratio */
                box-sizing: border-box !important;
                border: none !important;
                margin: 0 !important;
                padding: 6% !important; /* relative padding so it scales dynamically */
                page-break-after: always;
                break-after: page;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-shadow: none !important;
            }
        }
    `;
    document.head.appendChild(style);
}




