import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageSkeleton } from '../components/Skeleton';

interface Location {
    id: string;
    name: string;
    actualCost: number;
    customerCost: number;
}

interface Company {
    id: string;
    name: string;
    locations: Location[];
}

export default function ShippingCompanies() {
    const [searchTerm, setSearchTerm] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);

    // Modal States
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [quickViewCompany, setQuickViewCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompanies = async () => {
            const { data, error } = await supabase.from('shipping_companies').select('*').order('id');
            if (!error && data) setCompanies(data);
            setLoading(false);
        };

        fetchCompanies();
        const channel = supabase
            .channel('shipping-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipping_companies' }, () => fetchCompanies())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleDeleteCompanyClick = (id: string) => {
        setSelectedCompanyId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteSelectedClick = () => {
        setSelectedCompanyId(null);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedCompanyId) {
            // Optimistic UI
            setCompanies(prev => prev.filter(c => c.id !== selectedCompanyId));
            await supabase.from('shipping_companies').delete().eq('id', selectedCompanyId);
        } else {
            // Optimistic UI for bulk
            setCompanies(prev => prev.filter(c => !selectedIds.includes(c.id)));
            await supabase.from('shipping_companies').delete().in('id', selectedIds);
            setSelectedIds([]);
        }
        setIsDeleteModalOpen(false);
    };

    const filteredCompanies = companies.filter(c => c.name.includes(searchTerm));

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredCompanies.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">إدارة شركات الشحن</h1>
                <Link
                    to="/shipping/add"
                    className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>إضافة شركة جديدة</span>
                </Link>
            </div>

            <div className="bg-white shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pr-10 pl-4 py-2.5 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 text-sm outline-none transition-colors"
                            placeholder="ابحث عن شركة شحن..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleDeleteSelectedClick}
                            className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto"
                        >
                            <Trash2 className="w-4 h-4" />
                            حذف المحدد ({selectedIds.length})
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-center">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredCompanies.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 font-medium">رمز الشركة</th>
                                <th className="px-6 py-4 font-medium">اسم الشركة</th>
                                <th className="px-6 py-4 font-medium">عدد مناطق التغطية</th>
                                <th className="px-6 py-4 font-medium">متوسط تكلفة الشحن</th>
                                <th className="px-6 py-4 font-medium">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <React.Fragment key={i}>
                                        <tr className="border-b border-slate-100">
                                            {[4, 24, 20, 16, 16].map((w, j) => (
                                                <td key={j} className="px-6 py-4">
                                                    <div className={`animate-pulse bg-slate-200 rounded h-4 w-${w}`} />
                                                </td>
                                            ))}
                                        </tr>
                                    </React.Fragment>
                                ))
                            ) : filteredCompanies.map(company => {
                                const avgCost = company.locations.length > 0
                                    ? company.locations.reduce((acc, loc) => acc + loc.customerCost, 0) / company.locations.length
                                    : 0;

                                return (
                                    <tr key={company.id} className={`transition-colors hover:bg-slate-50 ${selectedIds.includes(company.id) ? 'bg-sky-50/50' : ''}`}>
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-sky-600 bg-white border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                                                checked={selectedIds.includes(company.id)}
                                                onChange={() => handleSelectRow(company.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-500 text-xs font-tajawal">{company.id}</td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            <div className="flex items-center justify-center gap-2">
                                                {company.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-none text-xs">
                                                {company.locations.length} محافظة
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700 font-tajawal">
                                            ~ {avgCost.toFixed(0)} ج.م
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setQuickViewCompany(company)}
                                                    className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-100 rounded"
                                                    title="معاينة التفاصيل"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <Link
                                                    to={`/shipping/edit/${company.id}`}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100 rounded"
                                                    title="تعديل"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    className="p-1.5 text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                                                    title="حذف"
                                                    onClick={() => handleDeleteCompanyClick(company.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredCompanies.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        لا توجد شركات شحن مطابقة للبحث
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-rose-100 flex items-center justify-center mb-4 mx-auto">
                                <Trash2 className="w-6 h-6 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">تأكيد الحذف</h3>
                            <p className="text-slate-500 text-center text-sm mb-6">
                                {selectedCompanyId ? 'هل أنت متأكد من رغبتك في حذف شركة الشحن هذه وجميع المحافظات المرتبطة بها؟ لا يمكن التراجع عن هذا الإجراء.' : `هل أنت متأكد من رغبتك في حذف ${selectedIds.length} شركات شحن؟ لا يمكن التراجع عن هذا الإجراء.`}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors shadow-sm shadow-rose-200"
                                >
                                    حذف نهائي
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            {quickViewCompany && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg border border-slate-200 shadow-xl max-h-[90vh] flex flex-col rounded-none">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg font-tajawal">{quickViewCompany.name}</h3>
                                <p className="text-slate-500 font-mono text-sm mt-0.5">{quickViewCompany.id}</p>
                            </div>
                            <button onClick={() => setQuickViewCompany(null)} className="text-slate-400 hover:text-slate-600 outline-none p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="bg-sky-50 p-4 border border-sky-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-sky-600 font-bold uppercase tracking-wider mb-1">مناطق التغطية</p>
                                    <p className="text-2xl font-bold text-sky-900 font-tajawal">{quickViewCompany.locations.length} <span className="text-sm font-normal">محافظة</span></p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">قائمة المحافظات والأسعار</p>
                                <div className="border border-slate-200 rounded overflow-hidden">
                                    <table className="w-full text-sm text-right">
                                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="py-2.5 px-4 font-bold">المحافظة</th>
                                                <th className="py-2.5 px-4 font-bold text-center">تكلفة العميل</th>
                                                <th className="py-2.5 px-4 font-bold text-center">التكلفة الفعلية</th>
                                                <th className="py-2.5 px-4 font-bold text-center">هامش الربح</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                            {quickViewCompany.locations.map((loc, idx) => {
                                                const profit = loc.customerCost - loc.actualCost;
                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-3 px-4 font-tajawal font-medium text-slate-800">{loc.name}</td>
                                                        <td className="py-3 px-4 text-center text-slate-700">{loc.customerCost}</td>
                                                        <td className="py-3 px-4 text-center text-slate-700">{loc.actualCost}</td>
                                                        <td className={`py-3 px-4 text-center font-bold ${profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                                            {profit > 0 ? '+' : ''}{profit}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {quickViewCompany.locations.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-8 text-center text-slate-500 font-tajawal">لم يتم إضافة محافظات لهذه الشركة بعد.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                            <button onClick={() => setQuickViewCompany(null)} className="w-full py-2.5 px-4 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition-colors font-tajawal">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
