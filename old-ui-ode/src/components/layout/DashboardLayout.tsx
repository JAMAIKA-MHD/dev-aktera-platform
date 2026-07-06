import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Database,
  Flame,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  SlidersHorizontal,
  Smartphone,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  mobileLabel: string;
  icon: typeof Gift;
  mobileVisible?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', mobileLabel: 'Home', icon: LayoutDashboard, mobileVisible: true },
  { to: '/dashboard/campaigns', label: 'Campaign Radios', mobileLabel: 'Portals', icon: SlidersHorizontal, mobileVisible: true },
  { to: '/dashboard/prizes', label: 'Reward Library', mobileLabel: 'Rewards', icon: Gift, mobileVisible: true },
  { to: '/dashboard/inventory', label: 'Stock Room', mobileLabel: 'Stocks', icon: Database, mobileVisible: true },
  { to: '/dashboard/analytics', label: 'Analytics Desk', mobileLabel: 'Stats', icon: BarChart3, mobileVisible: true },
  { to: '/dashboard/billing', label: 'Billing & Quotas', mobileLabel: 'Billing', icon: CreditCard },
  { to: '/dashboard/account', label: 'Organization Settings', mobileLabel: 'Account', icon: User },
];

export function DashboardLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-x-hidden bg-slate-50 font-sans text-slate-800">
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-[50vw] w-[50vw] rounded-full bg-indigo-500/5 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 z-0 h-[40vw] w-[40vw] rounded-full bg-violet-500/5 blur-[180px]" />

      <header className="relative z-20 flex w-full items-center justify-between border-b border-slate-200/80 bg-white px-6 py-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="touch-target rounded-xl border border-slate-200 px-3 text-slate-600 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900">DZENGAGE</h1>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                B2B SaaS
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500">Algerian Consumer Activation Desk</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard/sandbox')}
          className="touch-target inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow"
        >
          <Smartphone className="h-4 w-4 text-white" />
          <span className="hidden sm:inline">Interactive Player Sandbox</span>
          <span className="sm:hidden">Sandbox</span>
        </button>
      </header>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6">
        <aside className="sticky top-[90px] hidden h-[calc(100vh-140px)] w-64 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex lg:flex-col">
          <div className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="touch-target mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <Outlet />
        </main>
      </div>

      <footer className="relative z-10 hidden border-t border-slate-200/70 px-6 py-4 text-center text-[11px] text-slate-400 sm:block">
        <p>© 2026 DZENGAGE. Handcrafted with precision for Algerian Enterprise Brands.</p>
      </footer>

      <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-2 shadow-lg lg:hidden">
        {navItems.filter((item) => item.mobileVisible).map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 text-[9px] font-bold transition-all ${
                isActive ? 'bg-slate-100 text-indigo-600' : 'text-slate-500'
              }`}
            >
              <Icon className="mb-1 h-4 w-4" />
              <span>{item.mobileLabel}</span>
            </NavLink>
          );
        })}
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative h-full w-[320px] max-w-[88vw] bg-white p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-base font-extrabold tracking-tight text-slate-900">DZENGAGE</p>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                      B2B
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">Activation Desk</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="touch-target rounded-xl border border-slate-200 px-3 text-slate-600"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
                    className={({ isActive }) =>
                      `flex min-h-12 items-center gap-3 rounded-xl px-4 py-3.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`
                    }
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="touch-target mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default DashboardLayout;
