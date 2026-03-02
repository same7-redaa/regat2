import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, AlertTriangle, Package, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export default function Header() {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

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

  useEffect(() => {
    const fetchAlerts = async () => {
      // 1. Fetch delayed orders
      const { data: dbOrders } = await supabase.from('orders').select('id, status, date, orderDate, createdAt, customer, alertDurationDays').eq('status', 'تم الشحن');
      // 2. Fetch low stock products
      const { data: dbProducts } = await supabase.from('products').select('id, productName, stock, lowStockWarning');

      const alerts: any[] = [];

      if (dbOrders) {
        const today = new Date();
        dbOrders.forEach(o => {
          const allowDays = Number(o.alertDurationDays) || 0;
          const dateStr = o.date || o.orderDate || o.createdAt;
          if (dateStr && allowDays >= 0) {
            const orderDate = new Date(dateStr);
            const diffTime = today.getTime() - orderDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= allowDays) {
              alerts.push({
                id: `order-${o.id}`,
                type: 'order',
                title: 'تأخير شحنة!',
                message: `الطلب ${o.id} للعميل ${o.customer || ''} متأخر في الشحن لأكثر من ${allowDays} أيام.`,
                time: diffDays + ' أيام',
                icon: <AlertTriangle className="w-4 h-4 text-rose-500" />
              });
            }
          }
        });
      }

      if (dbProducts) {
        dbProducts.forEach(p => {
          const stock = Number(p.stock) || 0;
          const limit = Number(p.lowStockWarning) || 5;
          if (stock <= limit) {
            alerts.push({
              id: `product-${p.id}`,
              type: 'product',
              title: stock === 0 ? 'منتج نفذ من المخزون!' : 'نقص في المخزون!',
              message: `المنتج "${p.productName}" متبقي منه ${stock} فقط.`,
              time: 'الآن',
              icon: <Package className={`w-4 h-4 ${stock === 0 ? 'text-rose-500' : 'text-amber-500'}`} />
            });
          }
        });
      }

      setNotifications(alerts);
    };

    fetchAlerts();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 z-50 shrink-0 relative">
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
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white shadow-lg border border-slate-100 overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">الإشعارات ({notifications.length})</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500">
                      <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-50" />
                      <p className="text-sm">لا توجد أي إشعارات جديدة</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start">
                        <div className="mt-0.5 bg-white p-1 rounded-sm shadow-sm border border-slate-100">{notif.icon}</div>
                        <div>
                          <p className="text-sm text-slate-800 font-bold mb-1">{notif.title}</p>
                          <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">{notif.message}</p>
                          <p className="text-[10px] text-slate-400 font-tajawal">{notif.time}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-slate-100 text-center bg-slate-50">
                  <Link to="/orders" onClick={() => setIsNotificationsOpen(false)} className="text-sm text-sky-600 font-bold hover:underline">
                    مراجعة كل الطلبات والمخزون
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="w-10 h-10 bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 font-bold overflow-hidden shadow-sm">
            <User className="w-5 h-5 text-sky-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
