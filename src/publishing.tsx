import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LogIn, ArrowLeft, Eye, Pencil, Send, LogOut, Save, FileText } from 'lucide-react'
import type { Doc, Id } from '../convex/_generated/dataModel'
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
    <Robot /><div className="eyebrow accent">THE WRITING DESK</div><h1>Hello, Charlieb.</h1>
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
type PublishedPost = Draft & Pick<Doc<'posts'>, '_id' | 'publishedAt'>
type ServerDraft = Draft & Pick<Doc<'drafts'>, '_id' | 'updatedAt'>
type DraftSummary = Pick<Doc<'drafts'>, '_id' | 'title' | 'excerpt' | 'category' | 'updatedAt'>

const emptyDraft: Draft = { title: '', slug: '', excerpt: '', category: 'Life', content: '' }
const draftKey = 'charlieb-post-draft-v1'

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
  const drafts = useQuery(api.posts.listDrafts, isAuthenticated && viewer?.canPublish ? {} : 'skip')
  if (isLoading || viewer === undefined || (isAuthenticated && viewer?.canPublish && drafts === undefined)) return <Loading message="Opening your writing desk…" />
  if (!isAuthenticated || !viewer?.canPublish) return <Navigate to="/signin" replace />
  return <Editor drafts={drafts} />
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

export function DraftPost() {
  const { id = '' } = useParams()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const viewer = useQuery(api.posts.viewer)
  const draft = useQuery(api.posts.getDraft, isAuthenticated && viewer?.canPublish ? { id: id as Id<'drafts'> } : 'skip')
  if (isLoading || viewer === undefined) return <Loading message="Checking author access..." />
  if (!isAuthenticated || !viewer?.canPublish) return <Navigate to="/signin" replace />
  if (draft === undefined) return <Loading message="Opening your draft..." />
  if (!draft) return <section className="article"><h1>Draft not found.</h1><p className="form-help">This draft may have already been published.</p><Link className="back-link" to="/write">Back to the writing desk</Link></section>
  return <Editor key={draft._id} serverDraft={draft} />
}

function Editor({ post, serverDraft, drafts }: { post?: PublishedPost; serverDraft?: ServerDraft; drafts?: DraftSummary[] }) {
  const source = post ?? serverDraft
  const [draft, setDraft] = useState<Draft>(() => source ? {
    title: source.title, slug: source.slug, excerpt: source.excerpt, category: source.category, content: source.content,
  } : restoreDraft())
  const [preview, setPreview] = useState(false)
  const [operation, setOperation] = useState<'save' | 'publish' | null>(null)
  const [error, setError] = useState('')
  const [locallySaved, setLocallySaved] = useState(false)
  const location = useLocation()
  const [draftSaved, setDraftSaved] = useState(Boolean(location.state?.draftSaved))
  const slugEdited = useRef(Boolean(draft.slug))
  const published = useRef(false)
  const create = useMutation(api.posts.create)
  const update = useMutation(api.posts.update)
  const saveDraft = useMutation(api.posts.saveDraft)
  const publishDraft = useMutation(api.posts.publishDraft)
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const busy = operation !== null

  useEffect(() => {
    if (published.current || source) return
    try { localStorage.setItem(draftKey, JSON.stringify(draft)); setLocallySaved(true) } catch { setLocallySaved(false) }
  }, [draft, source])

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraftSaved(false)
    setDraft(previous => ({ ...previous, [key]: value,
      ...(key === 'title' && !slugEdited.current ? { slug: value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 160).replace(/-$/g, '') } : {}),
    }))
  }

  async function publish(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setOperation('publish'); setError('')
    try {
      const result = post ? await update({ id: post._id, ...draft }) : serverDraft ? await publishDraft({ id: serverDraft._id, ...draft }) : await create(draft)
      published.current = true
      try { if (!post) localStorage.removeItem(draftKey) } catch { /* Publishing succeeded even without storage. */ }
      navigate(`/posts/${result.slug}`, { state: post ? { updated: true } : { published: true } })
    } catch (caught) {
      setError(caught instanceof ConvexError ? String(caught.data) : post ? 'The changes could not be saved. Your edits are still here; please try again.' : 'The post could not be published. Your draft is still here; please try again.')
      setOperation(null)
    }
  }

  async function saveUnpublished() {
    if (busy || post) return
    setOperation('save'); setError('')
    try {
      const result = await saveDraft({ ...(serverDraft ? { id: serverDraft._id } : {}), ...draft })
      try { localStorage.removeItem(draftKey) } catch { /* The server copy is safely stored. */ }
      if (!serverDraft) navigate(`/drafts/${result.id}/edit`, { replace: true, state: { draftSaved: true } })
      else { setDraftSaved(true); setOperation(null) }
    } catch (caught) {
      setError(caught instanceof ConvexError ? String(caught.data) : 'The draft could not be saved. Your writing is still here; please try again.')
      setOperation(null)
    }
  }

  return <section className="editor article">
    <div className="editor-toolbar flex flex-wrap items-center justify-between gap-3"><Link to="/" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Journal</Link><button className="text-button inline-flex items-center gap-2" disabled={busy} onClick={async () => { try { await signOut(); navigate('/') } catch { setError('Could not sign out. Please try again.') } }}><LogOut size={14} /> Sign out</button></div>
    <div className="eyebrow accent">THE WRITING DESK</div><h1>{post ? 'Edit your entry.' : serverDraft ? 'Continue your draft.' : 'A new entry.'}</h1><p className="form-help">{post ? 'Revisit your words. Save when you are ready.' : serverDraft ? 'Private for now. Publish only when it feels ready.' : 'Start with a thought. See where it takes you.'}</p>
    {!source && drafts && drafts.length > 0 && <section className="draft-shelf" aria-labelledby="draft-shelf-title"><div className="draft-shelf-heading"><div><span className="eyebrow accent">UNPUBLISHED</span><h2 id="draft-shelf-title">Your drafts</h2></div><span>{drafts.length} saved</span></div>{drafts.map(item => <Link key={item._id} className="draft-row" to={`/drafts/${item._id}/edit`}><FileText size={17} /><div><strong>{item.title || 'Untitled draft'}</strong><span>{item.excerpt || `${item.category} draft`}</span></div><time dateTime={new Date(item.updatedAt).toISOString()}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(item.updatedAt)}</time></Link>)}</section>}
    {draftSaved && <p className="publish-success" role="status">Your draft is saved privately. Only you can see it.</p>}
    <div className="editor-tabs flex items-center justify-between"><div className="flex gap-2"><button className={!preview ? 'selected' : ''} aria-pressed={!preview} onClick={() => setPreview(false)}><Pencil size={14} /> Write</button><button className={preview ? 'selected' : ''} aria-pressed={preview} onClick={() => setPreview(true)}><Eye size={14} /> Preview</button></div><span>{post ? 'Changes save when you choose Save changes' : serverDraft ? draftSaved ? 'Draft saved privately' : 'Save when you pause' : locallySaved ? 'Backed up in this browser' : 'Not yet backed up'}</span></div>
    <form onSubmit={publish}>
      <fieldset disabled={busy} hidden={preview} className="editor-fields">
        <label>Title<input required maxLength={160} value={draft.title} onChange={event => change('title', event.target.value)} placeholder="What’s on your mind?" /></label>
        <div className="form-grid"><label>Category<select value={draft.category} onChange={event => change('category', event.target.value as Draft['category'])}><option>Life</option><option>Technology</option><option>Notes</option></select></label><label>Post URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={draft.slug} onChange={event => { slugEdited.current = true; change('slug', event.target.value) }} placeholder="your-post-title" /><span className="input-hint">/posts/{draft.slug || 'your-post-title'}</span></label></div>
        <label>Short summary<textarea required maxLength={400} rows={3} value={draft.excerpt} onChange={event => change('excerpt', event.target.value)} placeholder="A sentence or two for the journal page." /></label>
        <label>Your story<textarea required maxLength={100000} rows={15} className="story-input" value={draft.content} onChange={event => change('content', event.target.value)} placeholder="Begin here…" /><span className="input-hint">Plain text. Leave a blank line between paragraphs.</span></label>
      </fieldset>
      {preview && <div className="editor-preview"><Meta post={{ category: draft.category, publishedAt: post?.publishedAt ?? Date.now(), readingMinutes: Math.max(1, Math.ceil(draft.content.trim().split(/\s+/).length / 220)) }} /><h2>{draft.title || 'Your title goes here'}</h2><p className="article-deck">{draft.excerpt || 'Your short summary will appear here.'}</p><div className="author flex items-center gap-3"><Robot /><span>Written by Charlieb</span></div><PostBody content={draft.content || 'Your story will appear here.'} /></div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="publish-bar flex flex-wrap items-center justify-between gap-3"><span>{post ? 'Saved changes are visible to everyone immediately.' : 'A saved draft stays private until you publish it.'}</span><div className="publish-actions flex flex-wrap items-center gap-2">{post && !busy && <Link className="text-button" to={`/posts/${post.slug}`}>Cancel</Link>}{!post && <button className="secondary-button" type="button" disabled={busy} onClick={saveUnpublished}><Save size={16} />{operation === 'save' ? 'Saving draft...' : 'Save as draft'}</button>}<button className="primary-button" type={preview ? 'button' : 'submit'} disabled={busy} onClick={preview ? () => setPreview(false) : undefined}>{preview ? <><Pencil size={16} /> Back to writing</> : <><Send size={16} />{operation === 'publish' ? (post ? 'Saving...' : 'Publishing...') : post ? 'Save changes' : 'Publish post'}</>}</button></div></div>
    </form>
  </section>
}
