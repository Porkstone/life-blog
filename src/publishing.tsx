import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogIn, ArrowLeft, Eye, Pencil, Send, LogOut } from 'lucide-react'
import type { Doc } from '../convex/_generated/dataModel'
import { api } from '../convex/_generated/api'
import { Loading, Meta, PostBody, Robot } from './components'

export function AuthorLink() {
  const viewer = useQuery(api.posts.viewer)
  return <Link to={viewer?.canPublish ? '/write' : '/signin'}>{viewer?.canPublish ? 'Write a post' : 'Author sign in'}</Link>
}

export function SignIn() {
  const { signIn, signOut } = useAuthActions()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const viewer = useQuery(api.posts.viewer)
  const ready = useQuery(api.posts.signInReady)
  const [params] = useSearchParams()
  const [error, setError] = useState(params.has('error') ? 'Sign-in was not completed. Please try again with the Porkstone GitHub account.' : '')
  const [busy, setBusy] = useState(false)
  if (isLoading || viewer === undefined || ready === undefined) return <Loading message="Checking author access…" />
  if (viewer?.canPublish) return <Navigate to="/write" replace />
  return <section className="sign-in article">
    <Link to="/" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to the journal</Link>
    <Robot /><div className="eyebrow accent">THE WRITING DESK</div><h1>Hello, Charllieb.</h1>
    <p className="article-deck">A quiet place to put your thoughts into words.</p>
    <p className="form-help">Sign in with the Porkstone GitHub account to publish. Everyone can read the journal without signing in.</p>
    {!ready && <p className="form-notice" role="status">Author sign-in is being set up. Please check back shortly.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {isAuthenticated ? <><p className="form-error">This account doesn’t have publishing access.</p><button className="secondary-button" onClick={async () => { try { await signOut() } catch { setError('Could not sign out. Please try again.') } }}>Sign out</button></> :
      <button className="primary-button" disabled={busy || !ready} onClick={async () => {
        setBusy(true); setError('')
        try { await signIn('github', { redirectTo: '/write' }) }
        catch { setError('Could not start GitHub sign-in. Please try again.'); setBusy(false) }
      }}><LogIn size={18} />{busy ? 'Opening GitHub…' : 'Continue with GitHub'}</button>}
  </section>
}

type Draft = { title: string; slug: string; excerpt: string; category: 'Life' | 'Technology' | 'Notes'; content: string }
const emptyDraft: Draft = { title: '', slug: '', excerpt: '', category: 'Life', content: '' }
const draftKey = 'charllieb-post-draft-v1'
function restoreDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey) || 'null')
    if (value && ['title', 'slug', 'excerpt', 'content'].every(key => typeof value[key] === 'string') && ['Life', 'Technology', 'Notes'].includes(value.category)) return value
  } catch { /* Storage may be unavailable. */ }
  return { ...emptyDraft }
}

export function WritePost() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const viewer = useQuery(api.posts.viewer)
  if (isLoading || viewer === undefined) return <Loading message="Opening your writing desk…" />
  if (!isAuthenticated || !viewer?.canPublish) return <Navigate to="/signin" replace />
  return <Editor />
}

export function EditPost() {
  const { slug = '' } = useParams()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const viewer = useQuery(api.posts.viewer)
  const post = useQuery(api.posts.getBySlug, isAuthenticated && viewer?.canPublish ? { slug } : 'skip')
  if (isLoading || viewer === undefined) return <Loading message="Checking author access..." />
  if (!isAuthenticated || !viewer?.canPublish) return <Navigate to="/signin" replace />
  if (post === undefined) return <Loading message="Opening your post..." />
  if (!post) return <section className="article"><h1>Post not found.</h1><p className="form-help">This post may have moved or been removed.</p><Link className="back-link" to="/">Back to the journal</Link></section>
  return <Editor key={post._id} post={post} />
}

function Editor({ post }: { post?: Draft & Pick<Doc<'posts'>, '_id' | 'publishedAt'> }) {
  const [draft, setDraft] = useState<Draft>(() => post ? {
    title: post.title, slug: post.slug, excerpt: post.excerpt, category: post.category, content: post.content,
  } : restoreDraft())
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const slugEdited = useRef(Boolean(draft.slug))
  const published = useRef(false)
  const create = useMutation(api.posts.create)
  const update = useMutation(api.posts.update)
  const { signOut } = useAuthActions()
  const navigate = useNavigate()

  useEffect(() => {
    if (published.current || post) return
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); setSaved(true) } catch { setSaved(false) }
  }, [draft, post])

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft(previous => ({ ...previous, [key]: value,
      ...(key === 'title' && !slugEdited.current ? { slug: value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160).replace(/-$/g, '') } : {}),
    }))
  }

  async function publish(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const result = post ? await update({ id: post._id, ...draft }) : await create(draft)
      published.current = true
      try { if (!post) localStorage.removeItem(draftKey) } catch { /* Publishing succeeded even without storage. */ }
      navigate(`/posts/${result.slug}`, { state: post ? { updated: true } : { published: true } })
    } catch (error) {
      setError(error instanceof ConvexError ? String(error.data) : post ? 'The changes could not be saved. Your edits are still here; please try again.' : 'The post could not be published. Your draft is still here; please try again.')
      setBusy(false)
    }
  }

  return <section className="editor article">
    <div className="editor-toolbar flex flex-wrap items-center justify-between gap-3"><Link to="/" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Journal</Link><button className="text-button inline-flex items-center gap-2" disabled={busy} onClick={async () => { try { await signOut(); navigate('/') } catch { setError('Could not sign out. Please try again.') } }}><LogOut size={14} /> Sign out</button></div>
    <div className="eyebrow accent">THE WRITING DESK</div><h1>{post ? 'Edit your entry.' : 'A new entry.'}</h1><p className="form-help">{post ? 'Revisit your words. Save when you are ready.' : 'Start with a thought. See where it takes you.'}</p>
    <div className="editor-tabs flex items-center justify-between"><div className="flex gap-2"><button className={!preview ? 'selected' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={14} /> Write</button><button className={preview ? 'selected' : ''} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={14} /> Preview</button></div><span>{post ? 'Changes are saved when you choose Save changes' : saved ? 'Draft saved in this browser' : 'Draft is not saved locally'}</span></div>
    <form onSubmit={publish}>
      <fieldset disabled={busy} hidden={preview} className="editor-fields">
        <label>Title<input required maxLength={160} value={draft.title} onChange={e => change('title', e.target.value)} placeholder="What’s on your mind?" /></label>
        <div className="form-grid"><label>Category<select value={draft.category} onChange={e => change('category', e.target.value as Draft['category'])}><option>Life</option><option>Technology</option><option>Notes</option></select></label><label>Post URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={draft.slug} onChange={e => { slugEdited.current = true; change('slug', e.target.value) }} placeholder="your-post-title" /><span className="input-hint">/posts/{draft.slug || 'your-post-title'}</span></label></div>
        <label>Short summary<textarea required maxLength={400} rows={3} value={draft.excerpt} onChange={e => change('excerpt', e.target.value)} placeholder="A sentence or two for the journal page." /></label>
        <label>Your story<textarea required maxLength={100000} rows={15} className="story-input" value={draft.content} onChange={e => change('content', e.target.value)} placeholder="Begin here…" /><span className="input-hint">Plain text. Leave a blank line between paragraphs.</span></label>
      </fieldset>
      {preview && <div className="editor-preview"><Meta post={{ category: draft.category, publishedAt: post?.publishedAt ?? Date.now(), readingMinutes: Math.max(1, Math.ceil(draft.content.trim().split(/\s+/).length / 220)) }} /><h2>{draft.title || 'Your title goes here'}</h2><p className="article-deck">{draft.excerpt || 'Your short summary will appear here.'}</p><div className="author flex items-center gap-3"><Robot /><span>Written by Charllieb</span></div><PostBody content={draft.content || 'Your story will appear here.'} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="publish-bar flex flex-wrap items-center justify-between gap-3"><span>{post ? 'Saved changes are visible to everyone immediately.' : 'Publishing makes this post visible to everyone.'}</span>{post && !busy && <Link className="text-button" to={`/posts/${post.slug}`}>Cancel</Link>}<button className="primary-button" type={preview ? 'button' : 'submit'} disabled={busy} onClick={preview ? () => setPreview(false) : undefined}>{preview ? <><Pencil size={16} /> Back to writing</> : <><Send size={16} />{busy ? (post ? 'Saving...' : 'Publishing...') : post ? 'Save changes' : 'Publish post'}</>}</button></div>
    </form>
  </section>
}
