import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Lock, User, LogIn, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        setLoading(true);

        try {
            const { data, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .single();

            if (dbError || !data) {
                setError('بيانات الدخول غير صحيحة');
            } else {
                login(data);
                navigate('/');
            }
        } catch (err: any) {
            setError('حدث خطأ في الاتصال بالشبكة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white p-8 border border-slate-200 shadow-xl max-w-md w-full relative overflow-hidden">
                {/* Decorative Top Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-sky-600"></div>

                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-sky-50 shadow-sm">
                        <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 font-tajawal">مرحباً بك</h1>
                    <p className="text-sm text-slate-500 mt-2 font-tajawal">يرجى تسجيل الدخول للمتابعة</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="text-sm font-bold font-tajawal">{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 font-tajawal">اسم المستخدم</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pr-10 pl-4 py-3 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 text-sm font-tajawal transition-colors outline-none"
                                placeholder="أدخل اسم المستخدم"
                                dir="ltr"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 font-tajawal">كلمة المرور</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <Lock className="w-5 h-5 text-slate-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pr-10 pl-4 py-3 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 text-sm font-tajawal transition-colors outline-none"
                                placeholder="••••••••"
                                dir="ltr"
                                autoComplete="current-password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 shadow-md transition-all flex items-center justify-center gap-2 font-tajawal disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                تسجيل الدخول
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
