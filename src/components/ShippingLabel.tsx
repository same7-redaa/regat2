import React from 'react';

// ====== Shared Shipping Label – Auto-fits any thermal printer paper size ======
export const ShippingLabel: React.FC<{ order: any; companyName: string }> = ({ order, companyName }) => {
    const products = order.products || [];
    const totalQty = products.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0);

    return (
        <div 
            className="bg-white border border-slate-300 md:border-2 md:border-slate-800 flex flex-col shipping-label-card transition-all w-full max-w-[380px] aspect-[2/3] p-3 shadow-sm mx-auto justify-between text-slate-900 text-[11px]"
            style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
            {/* Header: Company name (right) + Order ID (left) */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-1">
                <div className="text-right">
                    {companyName
                        ? <div className="font-bold text-slate-900 leading-tight">{companyName}</div>
                        : <div className="font-bold text-slate-800 leading-tight">اسم الشركة</div>
                    }
                    <div className="text-slate-900 mt-0.5">بوليصة شحن</div>
                </div>
                <div className="text-left" dir="ltr">
                    <div className="font-bold text-slate-900">{order.id}</div>
                    <div className="text-slate-900">{order.orderDate} {order.orderTime}</div>
                </div>
            </div>

            {/* Customer + Phone */}
            <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-300 pb-1 mt-1">
                <div>
                    <div className="text-slate-800 mb-0.5">اسم العميل</div>
                    <div className="font-bold text-slate-900">{order.customerName || order.customer}</div>
                </div>
                <div className="space-y-0.5">
                    <div className="text-slate-800">الهاتف</div>
                    <div className="font-bold text-slate-900" dir="ltr">{order.primaryPhone}</div>
                    {order.secondaryPhone && (
                        <>
                            <div className="text-slate-800 mt-0.5">رقم إضافي</div>
                            <div className="text-slate-900" dir="ltr">{order.secondaryPhone}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="border-b border-dashed border-slate-300 pb-1 mt-1 flex gap-3">
                <div className="flex-shrink-0">
                    <div className="text-slate-800 mb-0.5">المحافظة</div>
                    <div className="font-bold text-sky-800">{order.shipping?.locationName || '—'}</div>
                </div>
                <div className="flex-1">
                    <div className="text-slate-800 mb-0.5">العنوان التفصيلي</div>
                    <div className="text-slate-900 leading-snug">{order.shipping?.detailedAddress || '—'}</div>
                </div>
            </div>

            {/* Products + Total box */}
            <div className="flex gap-2 items-stretch mt-1 flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-start">
                    <div className="text-slate-800 mb-0.5">المنتجات ({totalQty} قطعة)</div>
                    <div className="space-y-0.5 overflow-y-auto max-h-[75px] pr-1">
                        {products.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-900 truncate max-w-[150px]">{p.name}</span>
                                <span className="text-slate-900 mr-1">× {p.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border border-slate-800 p-1 text-center flex-shrink-0 flex flex-col justify-center items-center min-w-[70px]">
                    <div className="text-slate-800">الإجمالي</div>
                    <div className="font-bold text-slate-900">{order.total}</div>
                    <div className="text-slate-900">ج.م</div>
                </div>
            </div>

            {/* Shipping Company Name */}
            {order.shipping?.companyName && (
                <div className="border-t border-dashed border-slate-300 pt-1 mt-1 flex justify-between items-center">
                    <span className="text-slate-800">شركة الشحن:</span>
                    <span className="font-bold text-slate-900">{order.shipping.companyName}</span>
                </div>
            )}

            {/* Notes */}
            {order.notes && (
                <div className="border-t border-dashed border-slate-300 pt-1 mt-1">
                    <span className="text-slate-800">ملاحظات: </span>
                    <span className="text-slate-900 font-bold">{order.notes}</span>
                </div>
            )}
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
                visibility: hidden !important;
            }
            /* Collapse parent layout elements' heights and margins to zero to prevent blank page at top */
            #root, 
            #root > div, 
            #root > div > div, 
            main, 
            main > div {
                height: 0 !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                position: static !important;
                overflow: visible !important;
            }
            #print-area, #print-area * {
                visibility: visible !important;
                height: auto !important;
                min-height: auto !important;
            }
            #print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 0 !important;
            }
            .shipping-label-card {
                width: 95% !important;
                max-width: 95% !important;
                height: auto !important; /* Grow dynamically to fit content */
                aspect-ratio: auto !important; /* Do not lock to a fixed ratio to avoid overflows */
                box-sizing: border-box !important;
                border: none !important;
                margin: 0 auto !important; /* Centered horizontally to equalize left/right margins */
                padding: 4% 5% !important; /* relative padding so it scales dynamically */
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-after: always !important;
                break-after: page !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                gap: 8px !important; /* tight layout to fit page */
                box-shadow: none !important;
            }
            .shipping-label-card:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
            }
        }
    `;
    document.head.appendChild(style);
}




