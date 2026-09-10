import GitHub from '@auth/core/providers/github'
import { convexAuth } from '@convex-dev/auth/server'
import { AUTHOR_GITHUB_ID } from './author'

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [GitHub({
    profile(profile) {
      return {
        id: String(profile.id),
        githubId: String(profile.id),
        name: profile.name ?? profile.login,
        email: profile.email,
        image: profile.avatar_url,
      }
    },
  })],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.provider.id !== 'github' || args.profile.githubId !== AUTHOR_GITHUB_ID) {
        throw new Error('This journal is restricted to its author. Sign in with Porkstone on GitHub.')
      }
      const fields = {
        githubId: AUTHOR_GITHUB_ID,
        name: 'Charllieb',
        ...(typeof args.profile.email === 'string' ? { email: args.profile.email } : {}),
        ...(typeof args.profile.image === 'string' ? { image: args.profile.image } : {}),
      }
      if (args.existingUserId) {
        await ctx.db.patch(args.existingUserId, fields)
        return args.existingUserId
      }
      return await ctx.db.insert('users', fields)
    },
    async beforeSessionCreation(ctx, { userId }) {
      const user = await ctx.db.get(userId)
      if (user?.githubId !== AUTHOR_GITHUB_ID) throw new Error('Author access required.')
    },
  },
})
