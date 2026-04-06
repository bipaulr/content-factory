'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/campaign/new', label: 'New Campaign' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log(" Checking health at:", process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
        const result = await checkHealth();
        console.log(" Health check success:", result);
        setIsConnected(true);
      } catch (error) {
        console.log(" Health check failed:", error);
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            
            <span className="font-bold text-lg text-white">cofy.</span>
          </Link>

          {/* Right Side: Desktop Navigation + Profile Picture + Mobile Menu */}
          <div className="flex items-center gap-8">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "py-2 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-white border-b-2 border-white"
                        : "text-[#b0b0b0] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Profile Picture Dropdown */}
            {session?.user?.image && (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="relative p-0.5 rounded-full hover:opacity-80 transition-opacity"
                >
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] border border-[#3a3a3a] rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-[#3a3a3a]">
                      <p className="text-sm text-white truncate">{session.user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        signOut({ redirect: true, callbackUrl: '/login' });
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-[#b0b0b0] hover:text-white hover:bg-[#2a2a2a] transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-[#b0b0b0] hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#3a3a3a]">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-[#00d4ff] bg-[#1a1a1a]"
                      : "text-[#b0b0b0] hover:text-white hover:bg-[#1a1a1a]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
