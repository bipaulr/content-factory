'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    user: session?.user,
    backendToken: (session?.user as any)?.backendToken,
  };
}

export function useOptionalAuth() {
  const { data: session, status } = useSession();

  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    user: session?.user,
    backendToken: (session?.user as any)?.backendToken,
  };
}
