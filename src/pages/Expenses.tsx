import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Wallet, Calendar, Trash2, Tag, FileText, DollarSign } from 'lucide-react';
import { PageSkeleton, Spinner, TableRowSkeleton } from '../components/Skeleton';
import { ToastContainer, useToast } from '../components/Toast';

export default function Expenses() {
    const { toasts, addToast, removeToast } = useToast();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAddMode, setIsAddMode] = useState(false);

    // Form inputs
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('نثرية');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const categories = ['نثرية', 'إيجار', 'رواتب', 'إعلانات وتسويق', 'تغليف ومطبوعات', 'صيانة', 'أخرى'];

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setExpenses(data || []);
        } catch (error: any) {
            console.error('Error loading expenses:', error);
            if (error.code === 'PGRST204' || error.message?.includes('relation "expenses" does not exist')) {
                addToast('لم يتم العثور على جدول المصروفات في قاعدة البيانات. تواصل مع الدعم لإنشاء جدول expenses', 'error');
            } else {
                addToast('حدث خطأ أثناء تحميل المصروفات', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            addToast('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                amount: Number(amount),
                category,
                date,
                notes
            };

            const { data, error } = await supabase.from('expenses').insert([payload]).select();
            if (error) throw error;

            if (data && data.length > 0) {
                setExpenses([data[0], ...expenses]);
                addToast('تمت إضافة المصروف بنجاح', 'success');
                setIsAddMode(false);
                setAmount('');
                setNotes('');
                setDate(new Date().toISOString().split('T')[0]);
                setCategory('نثرية');
            }
        } catch (error: any) {
            console.error('Error adding expense:', error);
            addToast('حدث خطأ أثناء حفظ المصروف: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

        // Optimistic UI update
        const previousExpenses = [...expenses];
        setExpenses(expenses.filter(e => e.id !== id));

        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) {
                setExpenses(previousExpenses); // Revert on failure
                throw error;
            }
            addToast('تم حذف المصروف بنجاح');
        } catch (error: any) {
            console.error('Error deleting expense:', error);
            addToast('حدث خطأ أثناء الحذف', 'error');
        }
    };

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    if (loading) return <PageSkeleton />;

    return (
        <div className="w-full space-y-4">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-sky-600" />
                        سجل المصروفات
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">إجمالي المصروفات المسجلة: <strong className="text-slate-700">{totalExpenses} ج.م</strong></p>
                </div>
                {!isAddMode && (
                    <button
                        onClick={() => setIsAddMode(true)}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 font-bold transition-all shadow-sm shadow-sky-200 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة مصروف جديد
                    </button>
                )}
            </div>

            {isAddMode && (
                <div className="bg-white border border-sky-200 p-6 shadow-sm mb-6 relative">
                    <button onClick={() => setIsAddMode(false)} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">تسجيل مصروف جديد</h2>
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-sky-600" /> المبلغ (ج.م)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><Tag className="w-4 h-4 text-sky-600" /> التصنيف</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-none font-cairo"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-sky-600" /> التاريخ</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5"><FileText className="w-4 h-4 text-sky-600" /> ملاحظات (اختياري)</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-200 focus:outline-none"
                                placeholder="تفاصيل المصروف..."
                            />
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 mt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 flex justify-center items-center gap-2 disabled:opacity-70 transition-colors"
                            >
                                {saving ? <><Spinner size="md" color="white" /> جاري الحفظ...</> : 'حفظ المصروف'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                                <th className="px-6 py-4 font-bold">التاريخ</th>
                                <th className="px-6 py-4 font-bold">التصنيف</th>
                                <th className="px-6 py-4 font-bold">المبلغ (ج.م)</th>
                                <th className="px-6 py-4 font-bold w-1/3">ملاحظات</th>
                                <th className="px-6 py-4 font-bold text-left">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                        لا توجد مصروفات مسجلة
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">{expense.date}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-rose-600 font-tajawal drop-shadow-sm">{expense.amount}</td>
                                        <td className="px-6 py-4 text-slate-500">{expense.notes || '—'}</td>
                                        <td className="px-6 py-4 text-left">
                                            <button
                                                onClick={() => handleDelete(expense.id)}
                                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent rounded-full opacity-0 group-hover:opacity-100"
                                                title="حذف المصروف"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
