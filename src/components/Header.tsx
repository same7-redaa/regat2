import { useState, useRef, useEffect } from 'react';
import { Search, Bell } from 'lucide-react';

export default function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 z-10 shrink-0">
      <div className="flex items-center justify-between px-4 h-[65px]">
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pr-10 pl-4 py-2 border border-slate-300 bg-slate-50 focus:ring-sky-500 focus:border-sky-500 text-sm" 
              placeholder="ابحث هنا..." 
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative md:hidden">
             <button className="p-2 text-slate-500 hover:bg-slate-100">
                <Search className="w-6 h-6" />
             </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white"></span>
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">الإشعارات</h3>
                  <span className="text-xs text-sky-600 font-medium cursor-pointer hover:underline">تحديد الكل كمقروء</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <p className="text-sm text-slate-800 font-medium mb-1">تمت إضافة منتج جديد</p>
                    <p className="text-xs text-slate-500 font-tajawal">منذ 5 دقائق</p>
                  </div>
                  <div className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <p className="text-sm text-slate-800 font-medium mb-1">نقص في مخزون "لابتوب ديل"</p>
                    <p className="text-xs text-slate-500 font-tajawal">منذ ساعتين</p>
                  </div>
                  <div className="p-4 hover:bg-slate-50 cursor-pointer transition-colors">
                    <p className="text-sm text-slate-800 font-medium mb-1">تم تحديث بيانات الموردين</p>
                    <p className="text-xs text-slate-500 font-tajawal">منذ يوم</p>
                  </div>
                </div>
                <div className="p-3 border-t border-slate-100 text-center">
                  <button className="text-sm text-sky-600 font-medium hover:underline">عرض كل الإشعارات</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-10 h-10 bg-sky-100 border-2 border-sky-200 flex items-center justify-center text-sky-700 font-bold overflow-hidden">
            <img src="https://picsum.photos/seed/avatar/100/100" alt="User Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </div>
    </header>
  );
}
