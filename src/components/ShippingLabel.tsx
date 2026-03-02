import React from 'react';

// ====== Shared Shipping Label – Fixed compact size, always vertical ======
export const ShippingLabel: React.FC<{ order: any; companyName: string }> = ({ order, companyName }) => {
    const products = order.products || [];
    const totalQty = products.reduce((sum: number, p: any) => sum + Number(p.quantity || 0), 0);

    return (
        <div
            className="p-3 border-2 border-slate-800 flex flex-col gap-2 bg-white"
            style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl', pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
            {/* Header: Company name (right) + Order ID (left) */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-1.5">
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
            <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-300 pb-1.5">
                <div>
                    <div className="text-[10px] text-slate-500 mb-0.5">اسم العميل</div>
                    <div className="text-sm font-extrabold text-slate-900">{order.customerName || order.customer}</div>
                </div>
                <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-500">الهاتف</div>
                    <div className="text-xs font-mono font-bold" dir="ltr">{order.primaryPhone}</div>
                    {order.secondaryPhone && (
                        <>
                            <div className="text-[10px] text-slate-500">رقم إضافي</div>
                            <div className="text-xs font-mono text-slate-600" dir="ltr">{order.secondaryPhone}</div>
                        </>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="border-b border-dashed border-slate-300 pb-1.5 flex gap-3">
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
            <div className="flex gap-2 items-start">
                <div className="flex-1">
                    <div className="text-[10px] text-slate-500 mb-1">المنتجات ({totalQty} قطعة)</div>
                    <div className="space-y-0.5">
                        {products.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-[11px] text-slate-700">{p.name}</span>
                                <span className="text-[11px] font-mono text-slate-500 mr-1">× {p.quantity}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="border-2 border-slate-800 p-2 text-center flex-shrink-0 min-w-[65px]">
                    <div className="text-[10px] text-slate-500">الإجمالي</div>
                    <div className="text-base font-black text-slate-900">{order.total}</div>
                    <div className="text-[10px] text-slate-600">ج.م</div>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="border-t border-dashed border-slate-300 pt-1">
                    <span className="text-[10px] text-slate-500">ملاحظات: </span>
                    <span className="text-[11px] text-slate-700 font-medium">{order.notes}</span>
                </div>
            )}

            {/* Signature */}
            <div className="flex justify-end items-end pt-1 mt-auto border-t border-slate-200">
                <div className="text-[10px] text-slate-400 font-mono">{order.shipping?.companyName || ''}</div>
            </div>
        </div>
    );
}

// ====== Print CSS: single column, auto paper size ======
const PRINT_STYLE_ID = 'ma5zon-print-style';
export function injectPrintStyle() {
    const existing = document.getElementById(PRINT_STYLE_ID);
    if (existing) existing.remove();
    const style = document.createElement('style');
    style.id = PRINT_STYLE_ID;
    style.innerHTML = `
        @media print {
            @page { margin: 8mm; }
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 6mm;
                padding: 0;
                overflow: visible;
            }
        }
    `;
    document.head.appendChild(style);
}
