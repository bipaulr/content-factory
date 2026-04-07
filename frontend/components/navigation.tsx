'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '../lib/api';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { useLocalAuth } from '@/providers/auth-provider';
import { Avatar } from '@/components/avatar';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/campaign/new', label: 'New Campaign' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { localUser } = useLocalAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Determine which user auth to use
  const user = session?.user || localUser;
  const isAuthenticated = !!session?.user || !!localUser;

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

  // Handle logout for both auth types
  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    
    // If local auth, clear localStorage
    if (localUser) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Dispatch logout event so AuthProvider updates
      window.dispatchEvent(new Event('logout'));
      router.push('/login');
      return;
    }
    
    // If Google OAuth, use signOut
    if (session?.user) {
      await signOut({ redirect: true, callbackUrl: '/login' });
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#2a2a2a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="font-bold text-lg text-white">cofy.</span>
          </Link>

          {/* Right Side: Desktop Navigation + Profile + Mobile Menu */}
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

            {/* Profile Picture & Dropdown - Show for ALL authenticated users */}
            {isAuthenticated && user && (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="relative p-0.5 rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                  title={user.email || user.name}
                >
                  <Avatar 
                    name={user.name || ''} 
                    email={user.email || ''} 
                    image={((user as any).image || (user as any).image_url) || undefined}
                    size="md"
                  />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg shadow-xl py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-[#3a3a3a]">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          name={user.name || ''} 
                          email={user.email || ''} 
                          image={((user as any).image || (user as any).image_url) || undefined}
                          size="lg"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                          <p className="text-xs text-[#888888] truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-1"></div>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#b0b0b0] hover:text-white hover:bg-[#2a2a2a] transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
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
