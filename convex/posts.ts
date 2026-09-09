import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { category } from './schema'
import { getAuthor, requireAuthor } from './author'
import type { Doc } from './_generated/dataModel'

const summaryFields = {
  _id: v.id('posts'), title: v.string(), slug: v.string(), excerpt: v.string(),
  category, publishedAt: v.number(), readingMinutes: v.number(),
}
const summaryValidator = v.object(summaryFields)
const articleValidator = v.object({ ...summaryFields, content: v.string() })

function summarize(post: Doc<'posts'>) {
  return {
    _id: post._id, title: post.title, slug: post.slug, excerpt: post.excerpt,
    category: post.category, publishedAt: post.publishedAt, readingMinutes: post.readingMinutes,
  }
}

export const viewer = query({
  args: {},
  returns: v.union(v.null(), v.object({ name: v.string(), canPublish: v.boolean() })),
  handler: async ctx => {
    const author = await getAuthor(ctx)
    return author ? { name: 'Charlie', canPublish: true } : null
  },
})

export const signInReady = query({
  args: {}, returns: v.boolean(),
  handler: async () => Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET && process.env.JWT_PRIVATE_KEY && process.env.JWKS),
})

export const list = query({
  args: { category: v.optional(category), paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(summaryValidator), isDone: v.boolean(), continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(v.union(v.literal('SplitRecommended'), v.literal('SplitRequired'), v.null())),
  }),
  handler: async (ctx, args) => {
    const page = await (args.category
      ? ctx.db.query('posts').withIndex('by_category_and_publishedAt', q => q.eq('category', args.category!))
      : ctx.db.query('posts').withIndex('by_publishedAt'))
      .order('desc').paginate({ ...args.paginationOpts, numItems: Math.min(24, Math.max(1, args.paginationOpts.numItems)) })
    return { ...page, page: page.page.map(summarize) }
  },
})

export const latest = query({
  args: {}, returns: v.union(summaryValidator, v.null()),
  handler: async ctx => {
    const post = await ctx.db.query('posts').withIndex('by_publishedAt').order('desc').first()
    return post ? summarize(post) : null
  },
})

export const getBySlug = query({
  args: { slug: v.string() }, returns: v.union(articleValidator, v.null()),
  handler: async (ctx, { slug }) => {
    const post = await ctx.db.query('posts').withIndex('by_slug', q => q.eq('slug', slug)).unique()
    return post ? { ...summarize(post), content: post.content } : null
  },
})

export const create = mutation({
  args: { title: v.string(), excerpt: v.string(), category, content: v.string(), slug: v.string() },
  returns: v.object({ id: v.id('posts'), slug: v.string() }),
  handler: async (ctx, args) => {
    const author = await requireAuthor(ctx)
    const title = args.title.trim()
    const excerpt = args.excerpt.trim()
    const content = args.content.trim()
    const slug = args.slug.trim().toLowerCase()
    if (!title || title.length > 160) throw new ConvexError('Use a title between 1 and 160 characters.')
    if (!excerpt || excerpt.length > 400) throw new ConvexError('Use a summary between 1 and 400 characters.')
    if (!content || content.length > 100_000) throw new ConvexError('Write a post between 1 and 100,000 characters.')
    if (slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ConvexError('Use a URL slug of up to 160 lowercase letters, numbers, and hyphens.')
    }
    const existing = await ctx.db.query('posts').withIndex('by_slug', q => q.eq('slug', slug)).unique()
    if (existing) throw new ConvexError('That post URL is already in use. Choose a different slug.')
    const id = await ctx.db.insert('posts', {
      title, excerpt, content, slug, category: args.category, authorId: author._id,
      publishedAt: Date.now(), readingMinutes: Math.max(1, Math.ceil(content.split(/\s+/u).length / 220)),
    })
    return { id, slug }
  },
})
