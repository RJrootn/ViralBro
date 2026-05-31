import { type NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '@/lib/db/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
    newUser: '/dashboard',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.plan = (user as any).plan ?? 'FREE'
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`
    },
  },
  events: {
    async createUser({ user }) {
      try {
        await db.workspace.create({
          data: { userId: user.id, name: user.name ?? 'My Workspace' },
        })
        await db.aiCredit.create({
          data: { userId: user.id, amount: 50, reason: 'signup_bonus', balance: 50 },
        })
      } catch (e) {
        console.error('createUser event error:', e)
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}

declare module 'next-auth' {
  interface Session {
    user: { id: string; name: string | null; email: string | null; image: string | null; plan: string }
  }
}
