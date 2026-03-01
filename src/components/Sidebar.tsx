import { NavLink } from 'react-router-dom';
import { Home, Package, Settings, Users, ShoppingCart, ChevronRight, Truck, Wallet } from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const navItems = [
    { name: 'لوحة التقارير', path: '/', icon: Home },
    { name: 'إدارة الطلبات', path: '/orders', icon: ShoppingCart },
    { name: 'إدارة المخزون', path: '/inventory', icon: Package },
    { name: 'شركات الشحن', path: '/shipping', icon: Truck },
    { name: 'المصروفات', path: '/expenses', icon: Wallet },
    { name: 'الإعدادات', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={clsx(
        "bg-white border-l border-slate-200 transition-all duration-300 ease-in-out hidden md:flex flex-col z-20",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="h-[65px] flex items-center justify-center px-4 relative shrink-0">
        {isOpen ? (
          <div className="inline-flex flex-col items-center">
            <h1 className="text-2xl font-bold text-sky-600 font-tajawal leading-none">REGAT</h1>
            <div className="h-[2px] bg-sky-600 w-full mt-1.5"></div>
          </div>
        ) : (
          <div className="w-10 h-10 bg-sky-600 flex items-center justify-center text-white font-bold text-xl font-tajawal">
            R
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => clsx(
                  "flex items-center gap-3 px-3 py-3 transition-colors group relative",
                  isOpen ? "justify-start" : "justify-center",
                  isActive
                    ? "bg-sky-50 text-sky-600 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-sky-600"
                )}
                title={!isOpen ? item.name : undefined}
              >
                <Icon className={clsx("w-6 h-6 shrink-0")} />

                {isOpen && (
                  <span className="truncate">{item.name}</span>
                )}

                {/* Tooltip for collapsed state */}
                {!isOpen && (
                  <div className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className={clsx("w-5 h-5 transition-transform duration-300", !isOpen && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
