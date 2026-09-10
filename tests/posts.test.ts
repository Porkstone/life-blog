import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import schema from '../convex/schema'
import { api, internal } from '../convex/_generated/api'

const modules = import.meta.glob('../convex/**/*.ts')
const input = { title: 'A real entry', slug: 'a-real-entry', excerpt: 'A short introduction.', category: 'Life' as const, content: 'The first paragraph.\n\nThe second paragraph.' }

async function setupAuthor() {
  const t = convexTest(schema, modules)
  const userId = await t.run(ctx => ctx.db.insert('users', { name: 'Charlieb', githubId: '383633', email: 'private@example.com' }))
  return { t, author: t.withIdentity({ subject: `${userId}|test-session` }) }
}

describe('post publishing authorization', () => {
  test('the OAuth account callback rejects a different GitHub account', async () => {
    const t = convexTest(schema, modules)
    await t.run(ctx => ctx.db.insert('authVerifiers', { signature: 'test-signature' }))
    await expect(t.mutation(internal.auth.store, { args: {
      type: 'userOAuth', provider: 'github', providerAccountId: '99999',
      profile: { githubId: '99999', name: 'Charlieb' }, signature: 'test-signature',
    } })).rejects.toThrow('restricted to its author')
  })

  test('the OAuth account callback stores the allowed immutable GitHub ID', async () => {
    const t = convexTest(schema, modules)
    await t.run(ctx => ctx.db.insert('authVerifiers', { signature: 'author-signature' }))
    await t.mutation(internal.auth.store, { args: {
      type: 'userOAuth', provider: 'github', providerAccountId: '383633',
      profile: { githubId: '383633', name: 'Porkstone' }, signature: 'author-signature',
    } })
    const user = await t.run(ctx => ctx.db.query('users').first())
    expect(user).toMatchObject({ githubId: '383633', name: 'Charlieb' })
  })

  test('anonymous visitors can read but cannot publish', async () => {
    const t = convexTest(schema, modules)
    expect(await t.query(api.posts.viewer)).toBeNull()
    expect(await t.query(api.posts.latest)).toBeNull()
    await expect(t.mutation(api.posts.create, input)).rejects.toThrow('Only the blog author')
  })

  test('another signed-in account cannot impersonate Charlieb by name or email', async () => {
    const t = convexTest(schema, modules)
    const id = await t.run(ctx => ctx.db.insert('users', { name: 'Charlieb', email: 'private@example.com', githubId: '99999' }))
    const other = t.withIdentity({ subject: `${id}|test-session` })
    expect(await other.query(api.posts.viewer)).toBeNull()
    await expect(other.mutation(api.posts.create, input)).rejects.toThrow('Only the blog author')
  })

  test('the authorized author publishes persisted content readable without login', async () => {
    const { t, author } = await setupAuthor()
    expect(await author.query(api.posts.viewer)).toEqual({ name: 'Charlieb', canPublish: true })
    const result = await author.mutation(api.posts.create, input)
    const article = await t.query(api.posts.getBySlug, { slug: result.slug })
    expect(article).toMatchObject({ title: input.title, content: input.content, readingMinutes: 1 })
    expect(article).not.toHaveProperty('authorId')
    expect(article).not.toHaveProperty('email')
    expect(await t.query(api.posts.latest)).toMatchObject({ _id: result.id })
    expect(await t.query(api.posts.latest)).not.toHaveProperty('content')
  })

  test('duplicate URLs do not overwrite a published post', async () => {
    const { t, author } = await setupAuthor()
    await author.mutation(api.posts.create, input)
    await expect(author.mutation(api.posts.create, { ...input, title: 'Overwrite' })).rejects.toThrow('already in use')
    expect(await t.query(api.posts.getBySlug, { slug: input.slug })).toMatchObject({ title: input.title })
  })

  test('validates whitespace, URL format, and size on the server', async () => {
    const { author } = await setupAuthor()
    for (const overrides of [{ title: '   ' }, { title: 'a'.repeat(161) }, { excerpt: '' }, { excerpt: 'a'.repeat(401) }, { content: ' ' }, { content: 'a'.repeat(100001) }, { slug: '../admin' }, { slug: '' }]) {
      await expect(author.mutation(api.posts.create, { ...input, ...overrides })).rejects.toThrow()
    }
  })

  test('filters and paginates without leaking full article bodies', async () => {
    const { t, author } = await setupAuthor()
    for (let i = 0; i < 5; i++) await author.mutation(api.posts.create, { ...input, slug: `entry-${i}`, category: i % 2 ? 'Notes' : 'Life' })
    const first = await t.query(api.posts.list, { category: 'Life', paginationOpts: { cursor: null, numItems: 2 } })
    expect(first.page).toHaveLength(2)
    expect(first.page.every(p => p.category === 'Life')).toBe(true)
    expect(first.page[0]).not.toHaveProperty('content')
    const second = await t.query(api.posts.list, { category: 'Life', paginationOpts: { cursor: first.continueCursor, numItems: 2 } })
    expect(second.page).toHaveLength(1)
    expect(second.isDone).toBe(true)
    expect(new Set([...first.page, ...second.page].map(p => p._id)).size).toBe(3)
    expect(await t.query(api.posts.getBySlug, { slug: 'missing' })).toBeNull()
  })
})


describe('post editing', () => {
  test('only the authenticated author can update posts', async () => {
    const { t, author } = await setupAuthor()
    const { id } = await author.mutation(api.posts.create, input)
    const otherId = await t.run(ctx => ctx.db.insert('users', { githubId: '99999' }))
    const other = t.withIdentity({ subject: `${otherId}|test-session` })
    for (const visitor of [t, other]) {
      await expect(visitor.mutation(api.posts.update, { id, ...input, title: 'Unauthorized' })).rejects.toThrow('Only the blog author')
    }
    expect(await t.query(api.posts.getBySlug, { slug: input.slug })).toMatchObject({ title: input.title })
  })

  test('updates the existing post, preserving ownership and publication date', async () => {
    const { t, author } = await setupAuthor()
    const { id } = await author.mutation(api.posts.create, input)
    const original = await t.run(ctx => ctx.db.get(id))
    await author.mutation(api.posts.update, { id, ...input, title: ' Revised title ', category: 'Notes', content: 'word '.repeat(441) })
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({
      title: 'Revised title', category: 'Notes', readingMinutes: 3,
      authorId: original!.authorId, publishedAt: original!.publishedAt,
    })
    await author.mutation(api.posts.update, { id, ...input, slug: 'revised-url' })
    expect(await t.query(api.posts.getBySlug, { slug: input.slug })).toBeNull()
    expect(await t.query(api.posts.getBySlug, { slug: 'revised-url' })).toMatchObject({ _id: id })
  })

  test('rejects invalid edits, duplicate URLs, and missing posts', async () => {
    const { t, author } = await setupAuthor()
    const { id } = await author.mutation(api.posts.create, input)
    await author.mutation(api.posts.create, { ...input, slug: 'another-post' })
    for (const overrides of [{ title: ' ' }, { excerpt: 'a'.repeat(401) }, { content: '' }, { slug: '../invalid' }, { slug: 'another-post' }]) {
      await expect(author.mutation(api.posts.update, { id, ...input, ...overrides })).rejects.toThrow()
    }
    expect(await t.query(api.posts.getBySlug, { slug: input.slug })).toMatchObject({ title: input.title })
    await t.run(ctx => ctx.db.delete(id))
    await expect(author.mutation(api.posts.update, { id, ...input })).rejects.toThrow('no longer exists')
  })
})
