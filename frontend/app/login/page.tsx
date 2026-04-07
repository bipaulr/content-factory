'use client';

import AnimatedCharactersLoginPage from '@/components/ui/animated-characters-login-page';
import { useProtectAuthPages } from '@/hooks/useAuth';

export default function LoginPage() {
  // Redirect to dashboard if already authenticated
  useProtectAuthPages(true);
  
  return <AnimatedCharactersLoginPage />;
}
