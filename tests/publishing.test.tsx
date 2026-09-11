// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getFunctionName } from 'convex/server'
import { DraftPost, EditPost, WritePost } from '../src/publishing'

const { create, update, saveDraft, publishDraft, query, auth } = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), saveDraft: vi.fn(), publishDraft: vi.fn(), query: vi.fn(), auth: vi.fn() }))
vi.mock('convex/react', () => ({
  useConvexAuth: auth,
  useQuery: query,
  useMutation: (ref: Parameters<typeof getFunctionName>[0]) => ({
    'posts:create': create, 'posts:update': update, 'posts:saveDraft': saveDraft, 'posts:publishDraft': publishDraft,
  })[getFunctionName(ref)],
}))
vi.mock('@convex-dev/auth/react', () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }))

beforeEach(() => {
  localStorage.clear(); create.mockReset(); update.mockReset(); saveDraft.mockReset(); publishDraft.mockReset(); query.mockReset()
  auth.mockReturnValue({ isLoading: false, isAuthenticated: true })
  query.mockImplementation((ref: Parameters<typeof getFunctionName>[0]) => getFunctionName(ref) === 'posts:listDrafts' ? [] : { name: 'Charlieb', canPublish: true })
})
afterEach(cleanup)

function renderEditor() {
  render(<MemoryRouter initialEntries={['/write']}><Routes><Route path="/write" element={<WritePost />} /><Route path="/posts/:slug" element={<p>Published article</p>} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

async function fillPost(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), 'My next story')
  await user.type(screen.getByLabelText('Short summary'), 'A small summary.')
  await user.type(screen.getByLabelText(/Your story/), 'The first paragraph.\n\nThe next paragraph.')
}

test('preview keeps the draft, then publishes and clears the saved draft', async () => {
  create.mockResolvedValue({ slug: 'my-next-story', id: 'post-id' })
  const user = renderEditor()
  await fillPost(user)
  expect((screen.getByLabelText(/Post URL/) as HTMLInputElement).value).toBe('my-next-story')
  await user.click(screen.getByRole('button', { name: 'Preview', exact: true }))
  expect(screen.getByRole('heading', { name: 'My next story' })).toBeTruthy()
  expect(screen.getByText('The first paragraph.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Back to writing' }))
  await user.click(screen.getByRole('button', { name: 'Publish post' }))
  await screen.findByText('Published article')
  expect(create).toHaveBeenCalledOnce()
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: 'My next story', slug: 'my-next-story', category: 'Life' }))
  expect(localStorage.getItem('charlieb-post-draft-v1')).toBeNull()
})

test('a failed publication keeps the editor and local draft available', async () => {
  create.mockRejectedValue(new Error('Network unavailable'))
  const user = renderEditor()
  await fillPost(user)
  await user.click(screen.getByRole('button', { name: 'Publish post' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toContain('Your draft is still here')
  expect(JSON.parse(localStorage.getItem('charlieb-post-draft-v1')!).title).toBe('My next story')
  await waitFor(() => expect((screen.getByRole('button', { name: 'Publish post' }) as HTMLButtonElement).disabled).toBe(false))
})

test('saves an incomplete post as a private server draft and clears the browser backup', async () => {
  saveDraft.mockResolvedValue({ id: 'draft-id', updatedAt: 1000 })
  render(<MemoryRouter initialEntries={['/write']}><Routes><Route path="/write" element={<WritePost />} /><Route path="/drafts/:id/edit" element={<p>Private draft saved</p>} /></Routes></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Title'), 'An early thought')
  await user.click(screen.getByRole('button', { name: 'Save as draft' }))
  await screen.findByText('Private draft saved')
  expect(saveDraft).toHaveBeenCalledWith({ title: 'An early thought', slug: 'an-early-thought', excerpt: '', category: 'Life', content: '' })
  expect(create).not.toHaveBeenCalled()
  expect(localStorage.getItem('charlieb-post-draft-v1')).toBeNull()
})

test('restores a draft and preserves a manually chosen URL when the title changes', async () => {
  localStorage.setItem('charlieb-post-draft-v1', JSON.stringify({ title: 'Old title', slug: 'permanent-url', excerpt: 'Summary', content: 'Saved writing', category: 'Notes' }))
  const user = renderEditor()
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'A revised title')
  expect((screen.getByLabelText(/Post URL/) as HTMLInputElement).value).toBe('permanent-url')
  expect((screen.getByLabelText(/Your story/) as HTMLTextAreaElement).value).toBe('Saved writing')
})


const existingPost = { _id: 'post-id', title: 'Original title', slug: 'original-url', excerpt: 'Original summary', category: 'Life', content: 'Original story', publishedAt: 1000 }
function renderEdit() {
  query.mockImplementation((ref: Parameters<typeof getFunctionName>[0]) => getFunctionName(ref) === 'posts:viewer' ? { canPublish: true } : existingPost)
  render(<MemoryRouter initialEntries={['/posts/original-url/edit']}><Routes><Route path="/posts/:slug/edit" element={<EditPost />} /><Route path="/posts/:slug" element={<p>Updated article</p>} /><Route path="/signin" element={<p>Sign in required</p>} /></Routes></MemoryRouter>)
  return userEvent.setup()
}

test('loads existing content, previews edits, and saves without touching the new-post draft', async () => {
  localStorage.setItem('charlieb-post-draft-v1', 'unrelated draft')
  update.mockResolvedValue({ id: 'post-id', slug: 'original-url' })
  const user = renderEdit()
  expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Original title')
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'Revised title')
  await user.click(screen.getByRole('button', { name: 'Preview', exact: true }))
  expect(screen.getByRole('heading', { name: 'Revised title' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Back to writing' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByText('Updated article')
  expect(update).toHaveBeenCalledWith({ id: 'post-id', title: 'Revised title', slug: 'original-url', excerpt: 'Original summary', category: 'Life', content: 'Original story' })
  expect(create).not.toHaveBeenCalled()
  expect(localStorage.getItem('charlieb-post-draft-v1')).toBe('unrelated draft')
})

test('failed saves retain edits and allow retry', async () => {
  update.mockRejectedValue(new Error('Offline'))
  const user = renderEdit()
  await user.type(screen.getByLabelText('Title'), ' revised')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Your edits are still here')
  expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Original title revised')
  expect((screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement).disabled).toBe(false)
})

test('cancel returns to the article without saving', async () => {
  const user = renderEdit()
  await user.type(screen.getByLabelText('Title'), ' revised')
  await user.click(screen.getByRole('link', { name: 'Cancel' }))
  await screen.findByText('Updated article')
  expect(update).not.toHaveBeenCalled()
})

test('anonymous direct edit links require sign-in', async () => {
  auth.mockReturnValue({ isLoading: false, isAuthenticated: false })
  renderEdit()
  await screen.findByText('Sign in required')
  expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull()
})

test('loads a private draft and publishes it through the draft mutation', async () => {
  const privateDraft = { _id: 'draft-id', title: 'Draft title', slug: 'draft-title', excerpt: 'Draft summary', category: 'Notes', content: 'Draft story', updatedAt: 1000 }
  query.mockImplementation((ref: Parameters<typeof getFunctionName>[0]) => getFunctionName(ref) === 'posts:viewer' ? { canPublish: true } : privateDraft)
  publishDraft.mockResolvedValue({ id: 'post-id', slug: 'draft-title' })
  render(<MemoryRouter initialEntries={['/drafts/draft-id/edit']}><Routes><Route path="/drafts/:id/edit" element={<DraftPost />} /><Route path="/posts/:slug" element={<p>Published draft</p>} /></Routes></MemoryRouter>)
  const user = userEvent.setup()
  expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Draft title')
  await user.click(screen.getByRole('button', { name: 'Publish post' }))
  await screen.findByText('Published draft')
  expect(publishDraft).toHaveBeenCalledWith({ id: 'draft-id', title: 'Draft title', slug: 'draft-title', excerpt: 'Draft summary', category: 'Notes', content: 'Draft story' })
  expect(create).not.toHaveBeenCalled()
})
