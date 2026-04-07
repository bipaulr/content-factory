'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function Navigation() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    // Dispatch logout event for AuthProvider
    window.dispatchEvent(new Event('logout'));
    // Also clear any local auth
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  return (
    <nav className="bg-[#0a0a0a] border-b border-[#1e2021] py-4 px-6">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white hover:text-[#06ffa5]">
          Content Factory
        </Link>

        <div className="flex items-center gap-6">
          {session?.user ? (
            <>
              <span className="text-white text-sm">{session.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-[#06ffa5] hover:bg-[#00d4ff] text-black px-4 py-2 rounded font-semibold transition">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
