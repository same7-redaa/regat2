import React, { useState, useEffect } from 'react';
import { Save, Building2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/Skeleton';

export const SETTINGS_KEY = 'ma5zon_settings';

export function getSettings() {
    try {
        const s = localStorage.getItem(SETTINGS_KEY);
        return s ? JSON.parse(s) : { companyName: '' };
    } catch {
        return { companyName: '' };
    }
}

export default function Settings() {
    const [companyName, setCompanyName] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load from Supabase first, fallback to localStorage
        supabase.from('settings').select('*').eq('id', 'main').single().then(({ data }) => {
            if (data?.companyName) {
                setCompanyName(data.companyName);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName: data.companyName }));
            } else {
                const local = getSettings();
                setCompanyName(local.companyName || '');
            }
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const payload = { id: 'main', companyName };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName }));
        await supabase.from('settings').upsert(payload, { onConflict: 'id' });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    if (loading) return <div className="p-8 text-center text-slate-400">جاري التحميل...</div>;

    return (
        <div className="w-full max-w-xl mx-auto space-y-6 pb-12">
            <div className="border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
                <p className="text-sm text-slate-500 mt-1">إعدادات النظام</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                    <Building2 className="w-5 h-5 text-sky-600" />
                    <h2 className="font-bold text-slate-700 text-lg">بيانات الشركة / المتجر</h2>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">
                        اسم الشركة / المتجر
                        <span className="text-slate-400 font-normal mr-2 text-xs">(يظهر أعلى يمين بوليصة الشحن)</span>
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="مثال: متجر النور للإلكترونيات"
                        className="w-full px-4 py-2.5 border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 transition-colors text-slate-800"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">يُحفظ محلياً وعلى السحابة تلقائياً</p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-6 py-2.5 font-bold transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                >
                    {saved ? <CheckCircle className="w-4 h-4" /> : saving ? <Spinner size="sm" color="white" /> : <Save className="w-4 h-4" />}
                    {saved ? 'تم الحفظ!' : saving ? 'جاري...' : 'حفظ'}
                </button>
            </div>
        </div>
    );
}
