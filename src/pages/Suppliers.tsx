import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Search, Plus, Trash2, Edit2, FileText, ChevronDown, CheckCircle, CreditCard, Box, AlertCircle } from 'lucide-react';
import { Spinner } from '../components/Skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modals state
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [supplierForm, setSupplierForm] = useState({ name: '', notes: '' });

    const [selectedSupplier, setSelectedSupplier] = useState<any>(null); // To view invoices & payments
    const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

    // Invoices State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState({ product_name: '', quantity: '1', unit_price: '' });

    // Payments State
    const [payments, setPayments] = useState<any[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '' });

    const [loadingDetails, setLoadingDetails] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        const { data } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
        if (data) setSuppliers(data);
        setLoading(false);
    };

    const fetchSupplierDetails = async (supplierId: string) => {
        setLoadingDetails(true);
        const [invRes, payRes] = await Promise.all([
            supabase.from('supplier_invoices').select('*').eq('supplier_id', supplierId).order('date', { ascending: false }),
            supabase.from('supplier_payments').select('*').eq('supplier_id', supplierId).order('date', { ascending: false })
        ]);

        if (invRes.data) setInvoices(invRes.data);
        if (payRes.data) setPayments(payRes.data);
        setLoadingDetails(false);
    };

    const handleSelectSupplier = (s: any) => {
        setSelectedSupplier(s);
        fetchSupplierDetails(s.id);
    };

    // --- Supplier CRUD ---
    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        if (editingSupplier) {
            await supabase.from('suppliers').update(supplierForm).eq('id', editingSupplier.id);
        } else {
            await supabase.from('suppliers').insert([supplierForm]);
        }
        setShowSupplierModal(false);
        setSaving(false);
        fetchSuppliers();
    };

    const handleDeleteSupplier = async (id: string) => {
        if (!confirm('حذف المورد سيؤدي إلى حذف كافة فواتيره ومدفوعاته، هل أنت متأكد؟')) return;
        setLoading(true);
        await supabase.from('suppliers').delete().eq('id', id);
        if (selectedSupplier?.id === id) setSelectedSupplier(null);
        fetchSuppliers();
    };

    const openSupplierModal = (u: any = null) => {
        setEditingSupplier(u);
        setSupplierForm(u ? { name: u.name, notes: u.notes || '' } : { name: '', notes: '' });
        setShowSupplierModal(true);
    };

    // --- Invoices (Purchases) CRUD ---
    const handleSaveInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const q = Number(invoiceForm.quantity);
        const p = Number(invoiceForm.unit_price);
        const total = q * p;

        const payload = {
            supplier_id: selectedSupplier.id,
            product_name: invoiceForm.product_name,
            quantity: q,
            unit_price: p,
            total_price: total
        };

        await supabase.from('supplier_invoices').insert([payload]);

        // Update supplier balance
        const newTotalDue = Number(selectedSupplier.total_due) + total;
        const newBalance = newTotalDue - Number(selectedSupplier.total_paid);
        await supabase.from('suppliers').update({ total_due: newTotalDue, remaining_balance: newBalance }).eq('id', selectedSupplier.id);

        // Update local object
        setSelectedSupplier({ ...selectedSupplier, total_due: newTotalDue, remaining_balance: newBalance });

        setShowInvoiceModal(false);
        setInvoiceForm({ product_name: '', quantity: '1', unit_price: '' });
        setSaving(false);
        fetchSupplierDetails(selectedSupplier.id);
        fetchSuppliers(); // update list balance
    };

    // --- Payments CRUD ---
    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const amt = Number(paymentForm.amount);

        const payload = {
            supplier_id: selectedSupplier.id,
            amount: amt,
            notes: paymentForm.notes
        };

        await supabase.from('supplier_payments').insert([payload]);

        // Update supplier balance
        const newTotalPaid = Number(selectedSupplier.total_paid) + amt;
        const newBalance = Number(selectedSupplier.total_due) - newTotalPaid;
        await supabase.from('suppliers').update({ total_paid: newTotalPaid, remaining_balance: newBalance }).eq('id', selectedSupplier.id);

        // Update local object
        setSelectedSupplier({ ...selectedSupplier, total_paid: newTotalPaid, remaining_balance: newBalance });

        setShowPaymentModal(false);
        setPaymentForm({ amount: '', notes: '' });
        setSaving(false);
        fetchSupplierDetails(selectedSupplier.id);
        fetchSuppliers(); // update list balance
    };

    const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-6 h-6 text-sky-600" />
                        لوحة الموردين
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">إدارة البضائع الواردة، حسابات الموردين والمدفوعات</p>
                </div>
                <button
                    onClick={() => openSupplierModal(null)}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-4 shadow-sm transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة مورد جديد
                </button>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Master List */}
                <div className="lg:col-span-1 bg-white border border-slate-200 shadow-sm flex flex-col h-[700px]">
                    <div className="p-4 border-b border-slate-200">
                        <div className="relative">
                            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="بحث عن مورد..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-3 pr-10 py-2 border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 bg-slate-50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center p-8"><Spinner size="lg" color="sky" /></div>
                        ) : filteredSuppliers.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">لا يوجد موردين</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredSuppliers.map(s => (
                                    <div
                                        key={s.id}
                                        className={`p-4 cursor-pointer transition-colors relative group ${selectedSupplier?.id === s.id ? 'bg-sky-50 border-r-4 border-sky-600' : 'hover:bg-slate-50 border-r-4 border-transparent'}`}
                                        onClick={() => handleSelectSupplier(s)}
                                    >
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-slate-800">{s.name}</h3>
                                                    <div className="flex gap-4 mt-2 text-xs">
                                                        <div className="text-slate-500">مسحوبات: <span className="font-bold text-slate-700">{Number(s.total_due || 0).toLocaleString()} ج.م</span></div>
                                                        <div className="text-sky-600">مدفوع: <span className="font-bold">{Number(s.total_paid || 0).toLocaleString()} ج.م</span></div>
                                                    </div>
                                                </div>
                                                <div className="text-left font-tajawal flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-400">الباقي</span>
                                                    <span className={`font-bold ${Number(s.remaining_balance) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {Number(s.remaining_balance || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Row Actions - Now at the bottom inside card flow */}
                                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                                <button onClick={(e) => { e.stopPropagation(); openSupplierModal(s); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors font-medium border border-slate-200 rounded-sm">
                                                    <Edit2 className="w-3.5 h-3.5" /> تعديل
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSupplier(s.id); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors font-medium border border-slate-200 rounded-sm">
                                                    <Trash2 className="w-3.5 h-3.5" /> حذف
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2">
                    {!selectedSupplier ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                            <Users className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="font-bold text-lg">اختر مورداً من القائمة</p>
                            <p className="text-sm mt-1">أو قم بإضافة مورد جديد لعرض التفاصيل</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 shadow-sm flex flex-col h-[700px]">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-slate-200 bg-slate-50">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedSupplier.name}</h2>
                                        {selectedSupplier.notes && <p className="text-sm text-slate-500 mt-1">{selectedSupplier.notes}</p>}
                                    </div>
                                    <div className="text-left font-tajawal p-3 bg-white border border-rose-100 shadow-sm w-48 text-center rounded-sm">
                                        <div className="text-xs text-slate-500 mb-1">المتبقي للمورد (الديون)</div>
                                        <div className="text-2xl font-bold text-rose-600">{Number(selectedSupplier.remaining_balance || 0).toLocaleString()} <span className="text-sm">ج.م</span></div>
                                    </div>
                                </div>

                                {/* Detail Tabs */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setActiveTab('invoices')}
                                        className={`flex items-center gap-2 px-4 py-2 font-bold border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <Box className="w-4 h-4" /> بضائع وفواتير
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('payments')}
                                        className={`flex items-center gap-2 px-4 py-2 font-bold border-b-2 transition-colors ${activeTab === 'payments' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <CreditCard className="w-4 h-4" /> دفعات مسددة
                                    </button>
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                {loadingDetails ? (
                                    <div className="flex justify-center p-12"><Spinner size="lg" color="sky" /></div>
                                ) : activeTab === 'invoices' ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <button onClick={() => setShowInvoiceModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 shadow-sm text-sm flex items-center gap-2">
                                                <Plus className="w-4 h-4" /> إضافة بضاعة / فاتورة
                                            </button>
                                        </div>
                                        <div className="bg-white border border-slate-200 overflow-hidden">
                                            <table className="w-full text-right text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                    <tr>
                                                        <th className="p-3 font-bold">التاريخ</th>
                                                        <th className="p-3 font-bold">اسم المنتج</th>
                                                        <th className="p-3 font-bold text-center">الكمية</th>
                                                        <th className="p-3 font-bold">السعر للقطعة</th>
                                                        <th className="p-3 font-bold text-emerald-600">الإجمالي الدائن</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {invoices.length === 0 ? (
                                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">لم يتم تسجيل بضائع لهذا المورد</td></tr>
                                                    ) : invoices.map(inv => (
                                                        <tr key={inv.id} className="hover:bg-slate-50">
                                                            <td className="p-3 text-slate-500 font-mono text-xs" dir="ltr">{format(new Date(inv.date || inv.created_at), 'dd/MM/yyyy')}</td>
                                                            <td className="p-3 font-bold text-slate-700">{inv.product_name}</td>
                                                            <td className="p-3 text-center font-bold text-slate-800">{inv.quantity}</td>
                                                            <td className="p-3 text-slate-600 font-mono text-xs">{Number(inv.unit_price).toLocaleString()} ج.م</td>
                                                            <td className="p-3 font-bold text-emerald-600 font-mono text-sm">{Number(inv.total_price).toLocaleString()} ج.م</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <button onClick={() => setShowPaymentModal(true)} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 shadow-sm text-sm flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" /> تسديد دفعة مالية
                                            </button>
                                        </div>
                                        <div className="bg-white border border-slate-200 overflow-hidden">
                                            <table className="w-full text-right text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                                    <tr>
                                                        <th className="p-3 font-bold">التاريخ</th>
                                                        <th className="p-3 font-bold text-sky-600">المبلغ المُسدد</th>
                                                        <th className="p-3 font-bold w-1/2">ملاحظات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {payments.length === 0 ? (
                                                        <tr><td colSpan={3} className="p-8 text-center text-slate-400">لم يتم تسجيل مدفوعات لهذا المورد</td></tr>
                                                    ) : payments.map(pay => (
                                                        <tr key={pay.id} className="hover:bg-slate-50">
                                                            <td className="p-3 text-slate-500 font-mono text-xs" dir="ltr">{format(new Date(pay.date || pay.created_at), 'dd/MM/yyyy')}</td>
                                                            <td className="p-3 font-bold text-sky-600 font-mono text-sm">{Number(pay.amount).toLocaleString()} ج.م</td>
                                                            <td className="p-3 text-slate-600 text-xs">{pay.notes || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}

            {/* 1. Supplier Modal */}
            {showSupplierModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm shadow-xl outline-none">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
                            <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المورد</label>
                                <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات والتزامات</label>
                                <textarea rows={3} value={supplierForm.notes} onChange={e => setSupplierForm({ ...supplierForm, notes: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 resize-none"></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 border border-slate-300 font-bold hover:bg-slate-50">إلغاء</button>
                                <button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 font-bold min-w-[100px] flex justify-center items-center">{saving ? <Spinner size="sm" color="white" /> : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. Invoice Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-md shadow-xl outline-none">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">إضافة بضاعة (سحب مبلغ دائن)</h3>
                            <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSaveInvoice} className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 p-3 flex gap-2 text-sm text-amber-800 mb-2">
                                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                                <p>هذا الإجراء سيضيف القيمة الإجمالية إلى ديون المورد المطلوبة منك.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">اسم المنتج أو نوع البضاعة</label>
                                <input type="text" required value={invoiceForm.product_name} onChange={e => setInvoiceForm({ ...invoiceForm, product_name: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 bg-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">الكمية المستلمة</label>
                                    <input type="number" required min="1" step="0.01" value={invoiceForm.quantity} onChange={e => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 bg-white" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">السعر للقطعة (ج.م)</label>
                                    <input type="number" required min="0" step="any" value={invoiceForm.unit_price} onChange={e => setInvoiceForm({ ...invoiceForm, unit_price: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500 bg-white" dir="ltr" />
                                </div>
                            </div>
                            <div className="pt-2">
                                <span className="block text-sm text-slate-500">الإجمالي المستحق:</span>
                                <span className="text-xl font-bold font-mono text-emerald-600 break-all" dir="ltr">{(Number(invoiceForm.quantity || 0) * Number(invoiceForm.unit_price || 0)).toLocaleString()} ج.م</span>
                            </div>
                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setShowInvoiceModal(false)} className="px-4 py-2 border border-slate-300 font-bold hover:bg-slate-50">إلغاء</button>
                                <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 font-bold min-w-[100px] flex justify-center items-center">{saving ? <Spinner size="sm" color="white" /> : 'تسجيل السحب'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm shadow-xl outline-none">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">تسديد دفعة للمورد</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSavePayment} className="p-6 space-y-4">
                            <div className="bg-sky-50 border border-sky-200 p-3 flex gap-2 text-sm text-sky-800 mb-2">
                                <AlertCircle className="w-5 h-5 shrink-0 text-sky-600" />
                                <p>هذا المبلغ سيتم خصمه تلقائياً من المديونية المتبقية للمورد.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">المبلغ المسدد (ج.م)</label>
                                <input type="number" required min="0" step="any" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 bg-white text-lg font-bold" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات وطريقة الدفع (اختياري)</label>
                                <textarea rows={2} value={paymentForm.notes} onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 resize-none"></textarea>
                            </div>
                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-slate-300 font-bold hover:bg-slate-50">إلغاء</button>
                                <button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 font-bold min-w-[100px] flex justify-center items-center">{saving ? <Spinner size="sm" color="white" /> : 'حفظ الدفعة'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
