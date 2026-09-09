import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import type { QueryCtx } from './_generated/server'

// Porkstone's immutable GitHub account ID; never derived from client input.
export const AUTHOR_GITHUB_ID = '383633'

export async function getAuthor(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const userId = await getAuthUserId(ctx)
  if (!userId) return null
  const user = await ctx.db.get(userId)
  return user?.githubId === AUTHOR_GITHUB_ID ? user : null
}

export async function requireAuthor(ctx: QueryCtx) {
  const author = await getAuthor(ctx)
  if (!author) throw new ConvexError('Only the blog author can publish posts.')
  return author
}
