'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocalAuth } from '@/providers/auth-provider';

/**
 * Hook to redirect authenticated users away from auth pages (login/signup)
 * Usage: useProtectAuthPages(true) - set to true if this is an auth page
 */
export function useProtectAuthPages(isAuthPage: boolean = false) {
  const router = useRouter();
  const { data: session } = useSession();
  const { localUser, loading } = useLocalAuth();
  
  const isAuthenticated = !!session?.user || !!localUser;

  useEffect(() => {
    if (!loading && isAuthPage && isAuthenticated) {
      // Redirect to dashboard if user is authenticated
      router.push('/');
    }
  }, [isAuthenticated, loading, isAuthPage, router]);
}

/**
 * Hook to protect routes that require authentication
 * Usage: useRequireAuth() - redirects to login if not authenticated
 */
export function useRequireAuth() {
  const router = useRouter();
  const { data: session } = useSession();
  const { localUser, loading } = useLocalAuth();
  
  const isAuthenticated = !!session?.user || !!localUser;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if user is not authenticated
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  return isAuthenticated;
}
