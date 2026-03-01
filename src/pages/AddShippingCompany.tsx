import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Trash2, MapPin, Save } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Location {
    id: string;
    name: string;
    actualCost: number;
    customerCost: number;
}

export default function AddShippingCompany() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [companyName, setCompanyName] = useState('');
    const [locations, setLocations] = useState<Location[]>([
        { id: Date.now().toString(), name: '', actualCost: 0, customerCost: 0 }
    ]);
    const [saving, setSaving] = useState(false);

    const handleAddLocation = () => {
        setLocations([
            ...locations,
            { id: Date.now().toString(), name: '', actualCost: 0, customerCost: 0 }
        ]);
    };

    const handleRemoveLocation = (id: string) => {
        setLocations(locations.filter(loc => loc.id !== id));
    };

    const handleLocationChange = (id: string, field: keyof Location, value: string | number) => {
        setLocations(locations.map(loc => {
            if (loc.id === id) {
                return { ...loc, [field]: value };
            }
            return loc;
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!companyName.trim()) {
            alert('يرجى إدخال اسم الشركة');
            return;
        }

        setSaving(true);
        const validLocations = locations.filter(loc => loc.name.trim() !== '');
        const companyId = id || `SHP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

        const { error } = await supabase.from('shipping_companies').upsert({
            id: companyId,
            name: companyName,
            locations: validLocations
        }, { onConflict: 'id' });

        if (error) {
            alert('حدث خطأ أثناء الحفظ: ' + error.message);
            setSaving(false);
            return;
        }

        navigate('/shipping');
    };

    useEffect(() => {
        if (id) {
            supabase.from('shipping_companies').select('*').eq('id', id).single().then(({ data }) => {
                if (data) {
                    setCompanyName(data.name);
                    setLocations(data.locations?.length > 0 ? data.locations : [
                        { id: Date.now().toString(), name: '', actualCost: 0, customerCost: 0 }
                    ]);
                } else {
                    navigate('/shipping');
                }
            });
        }
    }, [id, navigate]);

    return (
        <div className="w-full space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <Link to="/shipping" className="p-2 hover:bg-slate-100 transition-colors text-slate-500">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">{id ? 'تعديل شركة شحن' : 'إضافة شركة شحن جديدة'}</h1>
                    <p className="text-sm text-slate-500 mt-1">أدخل بيانات شركة الشحن ومناطق التغطية بالتسعير المفصل</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Company Details Card */}
                <div className="bg-white shadow-sm border border-slate-100 p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-sky-600" />
                        البيانات الأساسية
                    </h2>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">اسم شركة الشحن</label>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full lg:w-1/2 px-4 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all"
                            placeholder="مثال: أرامكس, سمسا, دي إتش إل..."
                            required
                        />
                    </div>
                </div>

                {/* Locations Card */}
                <div className="bg-white shadow-sm border border-slate-100 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                مناطق التغطية والتسعير
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">تحديد تكلفة الشحن الفعلية (ماتدفعه للشركة) وتكلفة الشحن للعميل، ليتم حساب الفارق آلياً</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Header Row */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 text-sm font-bold text-slate-600 uppercase">
                            <div className="col-span-4">المحافظة / المنطقة</div>
                            <div className="col-span-3">التكلفة الفعلية (عليك)</div>
                            <div className="col-span-3">سعر الشحن (للعميل)</div>
                            <div className="col-span-2 text-center">الإجراءات</div>
                        </div>

                        {/* Location Rows */}
                        {locations.map((loc, index) => {
                            const diff = loc.actualCost - loc.customerCost;
                            return (
                                <div key={loc.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start md:items-center p-4 md:p-0 bg-slate-50 md:bg-transparent border border-slate-100 md:border-transparent">
                                    <div className="col-span-1 md:col-span-4">
                                        <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">المحافظة</label>
                                        <input
                                            type="text"
                                            value={loc.name}
                                            onChange={(e) => handleLocationChange(loc.id, 'name', e.target.value)}
                                            placeholder="مثال: الرياض"
                                            className="w-full px-4 py-2 border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">التكلفة الفعلية (عليك)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                value={loc.actualCost || ''}
                                                onChange={(e) => handleLocationChange(loc.id, 'actualCost', Number(e.target.value))}
                                                placeholder="75"
                                                className="w-full px-4 py-2 border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                                required
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">ج.م</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-3">
                                        <label className="block md:hidden text-xs font-bold text-slate-500 mb-1">سعر الشحن (للعميل)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                value={loc.customerCost || ''}
                                                onChange={(e) => handleLocationChange(loc.id, 'customerCost', Number(e.target.value))}
                                                placeholder="50"
                                                className="w-full px-4 py-2 border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                                required
                                            />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">ج.م</span>
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 flex items-center justify-between md:justify-center gap-2 mt-2 md:mt-0">
                                        <div className="md:hidden flex flex-col">
                                            <span className="text-xs text-slate-500">الفارق (عليك):</span>
                                            <span className={`font-bold ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {diff} ج.م
                                            </span>
                                        </div>
                                        {/* Tooltip for desktop difference */}
                                        <div className="hidden md:flex flex-col items-center justify-center w-full group relative">
                                            <span className={`text-sm font-bold bg-slate-100 px-2 py-1 rounded w-full text-center ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                {diff > 0 ? `-${diff}` : diff < 0 ? `+${Math.abs(diff)}` : '0'}
                                            </span>
                                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                                {diff > 0 ? `تتحمل ${diff} ج.م` : diff < 0 ? `ربح ${Math.abs(diff)} ج.م` : 'تكلفة متطابقة'}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLocation(loc.id)}
                                            disabled={locations.length === 1}
                                            className="p-2 text-rose-500 hover:bg-rose-50 transition-colors border border-transparent disabled:opacity-30 disabled:hover:bg-transparent"
                                            title="حذف المحافظة"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddLocation}
                        className="mt-4 flex items-center gap-2 text-sm font-bold text-sky-600 bg-sky-50 hover:bg-sky-100 px-4 py-2.5 transition-colors w-full md:w-auto justify-center"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة محافظة أخرى
                    </button>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 lg:flex-none bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 font-bold transition-all shadow-sm shadow-sky-200 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                        <Save className={`w-5 h-5 ${saving ? 'hidden' : ''}`} />
                        {saving ? <><span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> جاري الحفظ...</> : 'حفظ بيانات الشركة'}
                    </button>
                    <Link
                        to="/shipping"
                        className="flex-1 lg:flex-none bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-3 font-bold transition-colors text-center"
                    >
                        إلغاء
                    </Link>
                </div>
            </form>
        </div>
    );
}
