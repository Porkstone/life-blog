// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { WritePost } from '../src/publishing'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useQuery: () => ({ name: 'Charlie', canPublish: true }),
  useMutation: () => create,
}))
vi.mock('@convex-dev/auth/react', () => ({ useAuthActions: () => ({ signOut: vi.fn() }) }))

beforeEach(() => { localStorage.clear(); create.mockReset() })
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
  expect(localStorage.getItem('charlie-post-draft-v1')).toBeNull()
})

test('a failed publication keeps the editor and local draft available', async () => {
  create.mockRejectedValue(new Error('Network unavailable'))
  const user = renderEditor()
  await fillPost(user)
  await user.click(screen.getByRole('button', { name: 'Publish post' }))
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toContain('Your draft is still here')
  expect(JSON.parse(localStorage.getItem('charlie-post-draft-v1')!).title).toBe('My next story')
  await waitFor(() => expect((screen.getByRole('button', { name: 'Publish post' }) as HTMLButtonElement).disabled).toBe(false))
})

test('restores a draft and preserves a manually chosen URL when the title changes', async () => {
  localStorage.setItem('charlie-post-draft-v1', JSON.stringify({ title: 'Old title', slug: 'permanent-url', excerpt: 'Summary', content: 'Saved writing', category: 'Notes' }))
  const user = renderEditor()
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), 'A revised title')
  expect((screen.getByLabelText(/Post URL/) as HTMLInputElement).value).toBe('permanent-url')
  expect((screen.getByLabelText(/Your story/) as HTMLTextAreaElement).value).toBe('Saved writing')
})
