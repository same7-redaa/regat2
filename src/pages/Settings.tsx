import React, { useState, useEffect } from 'react';
import { Save, Building2, CheckCircle, Users, Settings as SettingsIcon, Plus, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';

export const SETTINGS_KEY = 'ma5zon_settings';

export function getSettings() {
    try {
        const s = localStorage.getItem(SETTINGS_KEY);
        return s ? JSON.parse(s) : { companyName: '' };
    } catch {
        return { companyName: '' };
    }
}

const AVAILABLE_PERMISSIONS = [
    { id: 'home', label: 'لوحة التقارير (الرئيسية)' },
    { id: 'orders', label: 'إدارة الطلبات' },
    { id: 'inventory', label: 'إدارة المخزون' },
    { id: 'shipping', label: 'شركات الشحن' },
    { id: 'suppliers', label: 'الموردين' },
    { id: 'expenses', label: 'المصروفات' },
    { id: 'settings', label: 'الإعدادات' },
];

export default function Settings() {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'general' | 'users'>('general');

    // General Settings State
    const [companyName, setCompanyName] = useState('');
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    // Users Management State
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'user', permissions: [] as string[] });

    useEffect(() => {
        // Load Settings
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

        if (currentUser?.role === 'admin') {
            fetchUsers();
        }
    }, [currentUser]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (data) setUsers(data);
        setLoadingUsers(false);
    };

    const handleSaveGeneral = async () => {
        setSaving(true);
        const payload = { id: 'main', companyName };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ companyName }));
        await supabase.from('settings').upsert(payload, { onConflict: 'id' });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = { ...userForm };

        if (editingUser) {
            await supabase.from('users').update(payload).eq('id', editingUser.id);
        } else {
            await supabase.from('users').insert([payload]);
        }

        setShowUserModal(false);
        setSaving(false);
        fetchUsers();
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        setLoadingUsers(true);
        await supabase.from('users').delete().eq('id', id);
        fetchUsers();
    };

    const openEditModal = (u: any) => {
        setEditingUser(u);
        setUserForm({ username: u.username, password: u.password, role: u.role, permissions: u.permissions || [] });
        setShowUserModal(true);
    };

    const openAddModal = () => {
        setEditingUser(null);
        setUserForm({ username: '', password: '', role: 'user', permissions: [] });
        setShowUserModal(true);
    };

    const togglePermission = (permId: string) => {
        setUserForm(prev => {
            const has = prev.permissions.includes(permId);
            if (has) return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
            return { ...prev, permissions: [...prev.permissions, permId] };
        });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">جاري التحميل...</div>;

    return (
        <div className="w-full space-y-6 pb-12">
            <div className="border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-800">الإعدادات</h1>
                <p className="text-sm text-slate-500 mt-1">إدارة إعدادات النظام والمستخدمين</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'general' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <SettingsIcon className="w-4 h-4 inline-block ml-2 mb-1" />
                    الإعدادات العامة
                </button>
                {currentUser?.role === 'admin' && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-bold border-b-2 transition-colors ${activeTab === 'users' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4 inline-block ml-2 mb-1" />
                        إدارة المستخدمين والصلاحيات
                    </button>
                )}
            </div>

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-6 max-w-2xl">
                    <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
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
                            onClick={handleSaveGeneral}
                            className={`flex items-center gap-2 px-6 py-2.5 font-bold transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-sky-600 hover:bg-sky-700 text-white'}`}
                        >
                            {saved ? <CheckCircle className="w-4 h-4" /> : saving ? <Spinner size="sm" color="white" /> : <Save className="w-4 h-4" />}
                            {saved ? 'تم الحفظ!' : saving ? 'جاري...' : 'حفظ'}
                        </button>
                    </div>
                </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && currentUser?.role === 'admin' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-700">المستخدمين ({users.length})</h2>
                        <button
                            onClick={openAddModal}
                            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 font-bold flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            إضافة مستخدم جديد
                        </button>
                    </div>

                    {loadingUsers ? (
                        <div className="p-8 text-center text-slate-400"><Spinner size="lg" color="sky" /></div>
                    ) : (
                        <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="p-4 font-bold">اسم المستخدم</th>
                                        <th className="p-4 font-bold">كلمة المرور</th>
                                        <th className="p-4 font-bold">الرتبة</th>
                                        <th className="p-4 font-bold">الصلاحيات</th>
                                        <th className="p-4 font-bold text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-medium text-slate-800">{u.username}</td>
                                            <td className="p-4 text-slate-500 font-mono text-xs">{u.password}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                                                    {u.role === 'admin' ? 'مدير' : 'موظف'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600 text-xs">
                                                {u.role === 'admin' ? 'كامل الصلاحيات' : (u.permissions?.length > 0 ? u.permissions.map((p: string) => AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label).join('، ') : 'بدون صلاحيات')}
                                            </td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button onClick={() => openEditModal(u)} className="p-1.5 text-sky-600 hover:bg-sky-50 transition-colors" title="تعديل">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                {u.username !== 'admin' && (
                                                    <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 transition-colors" title="حذف">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا يوجد مستخدمين. يرجى تهيئة قاعدة البيانات أولاً.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg shadow-xl outline-none">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
                            </h3>
                            <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
                        </div>
                        <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">اسم المستخدم</label>
                                    <input
                                        type="text"
                                        required
                                        value={userForm.username}
                                        onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                        className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                                    <input
                                        type="text"
                                        required
                                        value={userForm.password}
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                        className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">الرتبة</label>
                                <select
                                    value={userForm.role}
                                    onChange={e => setUserForm({ ...userForm, role: e.target.value, permissions: e.target.value === 'admin' ? [] : userForm.permissions })}
                                    className="w-full border border-slate-300 px-3 py-2 outline-none focus:border-sky-500 bg-white"
                                >
                                    <option value="user">موظف (محدد الصلاحيات)</option>
                                    <option value="admin">مدير (صلاحيات كاملة)</option>
                                </select>
                            </div>

                            {userForm.role !== 'admin' && (
                                <div className="pt-2 border-t border-slate-100 mt-4">
                                    <label className="block text-sm font-bold text-slate-700 mb-3">الصفحات المسموحة (الصلاحيات)</label>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {AVAILABLE_PERMISSIONS.map(p => (
                                            <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={userForm.permissions.includes(p.id)}
                                                    onChange={() => togglePermission(p.id)}
                                                    className="w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                                                />
                                                <span className="text-sm text-slate-700 group-hover:text-sky-600 transition-colors">{p.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 border border-slate-300 font-bold hover:bg-slate-50 transition-colors">
                                    إلغاء
                                </button>
                                <button type="submit" disabled={saving} className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 font-bold transition-colors flex justify-center items-center min-w-[100px]">
                                    {saving ? <Spinner size="sm" color="white" /> : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
