import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Shirt,
  Truck,
  Boxes,
  Receipt,
  WalletCards,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'POS Billing', path: '/pos', icon: ShoppingCart, hotkey: 'F1', badge: 'Fast' },
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Products & Stock', path: '/products', icon: Shirt },
    { label: 'Purchases (Inward)', path: '/purchases', icon: Truck, adminOnly: true },
    { label: 'Inventory & Alerts', path: '/inventory', icon: Boxes },
    { label: 'Order History', path: '/orders', icon: Receipt },
    { label: 'Expenses', path: '/expenses', icon: WalletCards, adminOnly: true },
    { label: 'Reports & P&L', path: '/reports', icon: BarChart3, adminOnly: true },
    { label: 'Employees', path: '/employees', icon: Users, adminOnly: true },
    { label: 'Settings', path: '/settings', icon: Settings, adminOnly: true },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between shadow-xl z-20">
        <div>
          {/* Brand Logo & Name */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
            <div className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
              <Shirt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-wide">ASRTEX POS</h1>
              <p className="text-xs text-slate-400 font-medium">Textile & Readymades</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* User Info & Logout Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.employeeName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isAdmin ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-xs text-slate-400 font-medium capitalize">
                  {user?.role?.toLowerCase()}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
};
