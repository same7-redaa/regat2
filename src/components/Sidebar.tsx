import { NavLink } from 'react-router-dom';
import { Home, Package, Settings, Users, ShoppingCart, ChevronRight, Truck, Wallet, FileText, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { hasPermission, logout } = useAuth();

  const allNavItems = [
    { name: 'لوحة التقارير', path: '/', id: 'home', icon: Home },
    { name: 'إدارة الطلبات', path: '/orders', id: 'orders', icon: ShoppingCart },
    { name: 'إدارة المخزون', path: '/inventory', id: 'inventory', icon: Package },
    { name: 'شركات الشحن', path: '/shipping', id: 'shipping', icon: Truck },
    { name: 'الموردين', path: '/suppliers', id: 'suppliers', icon: Users },
    { name: 'المصروفات', path: '/expenses', id: 'expenses', icon: Wallet },
    { name: 'الإعدادات', path: '/settings', id: 'settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => hasPermission(item.id));

  return (
    <aside
      className={clsx(
        "bg-white border-l border-slate-200 transition-all duration-300 ease-in-out flex flex-col z-50",
        // Desktop
        "md:relative md:translate-x-0 hidden md:flex",
        isOpen ? "md:w-64" : "md:w-20",
        // Mobile overrides
        "fixed inset-y-0 right-0 h-full w-64 shadow-2xl md:shadow-none",
        !isOpen ? "translate-x-full md:translate-x-0 !hidden md:!flex" : "translate-x-0 !flex"
      )}
    >
      <div className="h-[65px] flex items-center justify-center px-4 relative shrink-0 border-b border-slate-100">
        {isOpen ? (
          <div className="flex items-center justify-center w-full h-full p-2">
            <img src="/logo.jpeg" alt="Logo" className="max-h-full max-w-full object-contain mix-blend-multiply" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full h-full p-1.5 pt-2 border-b-2 border-transparent">
            <img src="/logo.jpeg" alt="Logo" className="w-8 h-8 object-cover rounded-full mix-blend-multiply border border-slate-200" />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
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
                onClick={() => {
                  if (window.innerWidth < 768 && isOpen && toggleSidebar) {
                    toggleSidebar();
                  }
                }}
              >
                <Icon className={clsx("w-6 h-6 shrink-0")} />

                {isOpen && (
                  <span className="truncate">{item.name}</span>
                )}

                {/* Tooltip for collapsed state */}
                {!isOpen && (
                  <div className="absolute right-full mr-2 px-2 py-1 bg-slate-800 text-white text-xs opacity-0 invisible md:group-hover:opacity-100 md:group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 space-y-2 shrink-0">
        <button
          onClick={() => {
            logout();
            toggleSidebar(); // Close sidebar on mobile after logout
          }}
          className={clsx(
            "flex items-center gap-3 w-full p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors font-medium rounded-md",
            isOpen ? "justify-start px-3" : "justify-center"
          )}
          title={!isOpen ? "تسجيل الخروج" : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span>تسجيل الخروج</span>}
        </button>

        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 text-slate-500 hover:bg-slate-100 transition-colors rounded-md"
        >
          <ChevronRight className={clsx("w-5 h-5 transition-transform duration-300", !isOpen && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
