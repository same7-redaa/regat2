import { NavLink } from 'react-router-dom';
import { Home, Package, BarChart3, Settings } from 'lucide-react';
import { clsx } from 'clsx';

export default function BottomNav() {
  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'المخزون', path: '/inventory', icon: Package },
    { name: 'التقارير', path: '/reports', icon: BarChart3 },
    { name: 'الإعدادات', path: '/settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-2 z-30">
      <nav className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => clsx(
                "flex flex-col items-center justify-center w-full h-full space-y-1",
                isActive ? "text-sky-600" : "text-slate-500 hover:text-sky-500"
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
