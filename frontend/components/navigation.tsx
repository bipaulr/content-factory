'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { checkHealth } from '@/lib/api';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/campaign/new', label: 'New Campaign' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
];

export function Navigation() {
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            {/* <div className="flex items-center gap-1.5 ml-2">
              <div className={cn(
                "w-2 h-2 transition-colors",
                isConnected ? "bg-[#06ffa5]" : "bg-[#ff006e]"
              )} />
              <span className="text-xs text-[#808080]">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div> */}
          </Link>

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
