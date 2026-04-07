import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // On initial sign in
      if (profile) {
        token.id = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture; // Google profile picture

        // Call backend to create/update user with profile picture
        // Only call backend if API URL is configured and we're not in build time
        if (process.env.NEXT_PUBLIC_API_URL) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-callback`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  google_id: profile.sub,
                  email: profile.email,
                  name: profile.name,
                  image_url: profile.picture, // Pass Google profile picture
                }),
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              token.backendToken = data.token;
              token.userId = data.user.user_id;
            }
          } catch (error) {
            // Log error but don't fail auth - user can still sign in
            // Backend sync is non-critical for auth flow
            console.error('Failed to sync with backend:', error);
          }
        }
      }

      // Persist token for subsequent requests
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      // Add user data to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = token.picture as string; // Google profile picture
        (session.user as any).backendToken = token.backendToken;
        (session.user as any).userId = token.userId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
};
