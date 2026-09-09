import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const category = v.union(v.literal('Life'), v.literal('Technology'), v.literal('Notes'))

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    githubId: v.optional(v.string()),
  }).index('email', ['email']).index('phone', ['phone']),
  posts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    category,
    content: v.string(),
    authorId: v.id('users'),
    publishedAt: v.number(),
    readingMinutes: v.number(),
  }).index('by_slug', ['slug'])
    .index('by_publishedAt', ['publishedAt'])
    .index('by_category_and_publishedAt', ['category', 'publishedAt']),
})
