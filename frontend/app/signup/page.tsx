'use client';

import AnimatedCharactersSignupPage from "@/components/ui/animated-characters-signup-page";
import { useProtectAuthPages } from '@/hooks/useAuth';

export default function SignupPage() {
  // Redirect to dashboard if already authenticated
  useProtectAuthPages(true);
  
  return <AnimatedCharactersSignupPage />;
}
