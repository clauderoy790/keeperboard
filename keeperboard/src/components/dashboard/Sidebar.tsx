'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/(auth)/actions';

interface SidebarProps {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ userEmail, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: '/dashboard/games',
      label: 'Games',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      )
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(href);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen w-72 bg-neutral-950 border-r-2 border-cyan-500/20
        transform transition-transform duration-300 ease-in-out z-50
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Header with scan line effect */}
        <div className="relative p-6 border-b-2 border-cyan-500/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent animate-pulse" />
          <div className="relative">
            <h1 className="text-2xl font-mono font-bold text-cyan-400 tracking-wider">
              KEEPER
              <span className="text-cyan-300">BOARD</span>
            </h1>
            <div className="mt-1 h-0.5 w-full bg-gradient-to-r from-cyan-500 to-transparent" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`
                  group relative flex items-center gap-3 px-4 py-3
                  font-mono text-sm tracking-wider transition-all duration-200
                  ${active
                    ? 'bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-500'
                    : 'text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900/50 border-l-4 border-transparent hover:border-cyan-500/30'
                  }
                `}
              >
                <span className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className="uppercase font-semibold">{item.label}</span>

                {/* Active indicator glow */}
                {active && (
                  <span className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t-2 border-cyan-500/20 bg-neutral-950">
          <div className="mb-3 p-3 bg-neutral-900/50 border border-cyan-500/20">
            <div className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-1">
              User
            </div>
            <div className="text-sm font-mono text-cyan-400 truncate">
              {userEmail}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-neutral-900 text-neutral-400 hover:text-red-400 border-2 border-neutral-800 hover:border-red-500/30 font-mono text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
