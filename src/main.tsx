import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react'
import { ConvexReactClient, usePaginatedQuery, useQuery } from 'convex/react'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { api } from '../convex/_generated/api'
import { BackLink, ErrorBoundary, formatDate, Loading, Meta, PostBody, Robot } from './components'
import { AuthorLink, SignIn, WritePost } from './publishing'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/400-italic.css'
import './style.css'

type Category = 'Life' | 'Technology' | 'Notes'

function Home() {
  const [filter, setFilter] = useState<Category | 'All posts'>('All posts')
  const latest = useQuery(api.posts.latest)
  const { results, status, loadMore } = usePaginatedQuery(api.posts.list, filter === 'All posts' ? {} : { category: filter }, { initialNumItems: 12 })
  return <>
    <h1 className="sr-only">Journal</h1>
    <figure className="skyline"><img src="/images/london.png" alt="A playful black and white London skyline, with robots climbing its landmarks" /><figcaption>LONDON, EARTH <span>—</span> MOSTLY HUMAN.</figcaption></figure>
    {latest === undefined ? <Loading /> : latest && <section className="featured"><div><div className="eyebrow accent">THE LATEST ENTRY</div><Link className="feature-link" to={`/posts/${latest.slug}`}><h2>{latest.title}</h2></Link><p>{latest.excerpt}</p><Meta post={latest} /><Link className="read-link inline-flex items-center gap-2" to={`/posts/${latest.slug}`}>Read the story <ArrowUpRight size={17} /></Link></div><Link to={`/posts/${latest.slug}`} className="robot-card" aria-label={`Read ${latest.title}`}><span className="card-top">A NOTE TO SELF <span>001</span></span><Robot /><span className="card-bottom">Less noise. More life.</span></Link></section>}
    <section className={`writing ${latest === null ? 'first-entry' : ''}`} id="writing">
      <div className="writing-heading flex flex-wrap items-center justify-between gap-4"><h2>All writing</h2><div className="filters flex flex-wrap gap-1" aria-label="Filter posts">{(['All posts', 'Life', 'Technology', 'Notes'] as const).map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={filter === item ? 'selected' : ''}>{item}</button>)}</div></div>
      <div aria-live="polite">{status === 'LoadingFirstPage' ? <Loading message="Loading stories…" /> : results.length === 0 ? <div className="empty-state"><h3>{filter === 'All posts' ? 'The first page is still to come.' : `No ${filter.toLowerCase()} entries yet.`}</h3><p>{filter === 'All posts' ? 'A few thoughts are taking shape. Come back soon.' : 'Try another topic, or come back for the next story.'}</p></div> : results.map(post => <Link className="post-row" key={post._id} to={`/posts/${post.slug}`}><time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt, true)}</time><div><h3>{post.title}</h3><p>{post.excerpt}</p><span className="mobile-meta">{post.category} · {post.readingMinutes} min read</span></div><span className="row-category">{post.category}</span><ArrowUpRight className="row-arrow" size={19} /></Link>)}</div>
      {(status === 'CanLoadMore' || status === 'LoadingMore') && <button className="secondary-button load-more" disabled={status === 'LoadingMore'} onClick={() => loadMore(12)}>{status === 'LoadingMore' ? 'Loading…' : 'More stories'}</button>}
    </section>
    <aside className="hello flex items-center gap-5"><Robot /><div><h3>A person behind the pixels.</h3><p>100% Human</p><Link to="/about" className="inline-flex items-center gap-1">A little more about me <ArrowRight size={14} /></Link></div></aside>
  </>
}

function Article() {
  const { slug = '' } = useParams()
  const location = useLocation()
  const post = useQuery(api.posts.getBySlug, { slug })
  useEffect(() => { if (post) document.title = `${post.title} — Charlie’s journal` }, [post])
  if (post === undefined) return <Loading message="Opening the story…" />
  if (!post) return <NotFound />
  return <article className="article">
    <BackLink />{location.state?.published && <p className="publish-success" role="status">Your post is published. It’s now part of the journal.</p>}
    <Meta post={post} /><h1>{post.title}</h1><p className="article-deck">{post.excerpt}</p>
    <div className="author flex items-center gap-3"><Robot /><span>Written by Charlie</span></div>
    <PostBody content={post.content} /><div className="article-end" aria-hidden="true">✳</div>
    <Link to="/#writing" className="next-post"><span className="eyebrow">KEEP EXPLORING</span><h2>Back to the journal <ArrowRight size={22} /></h2></Link>
  </article>
}

function About() { return <section className="about article"><Link to="/" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to the journal</Link><div className="eyebrow accent">HELLO THERE</div><h1>A person behind<br />the pixels.</h1><div className="about-robot"><Robot /></div><div className="prose"><p>I’m Charlie. A curious human who likes building things, exploring London, and writing down what I learn along the way.</p><p>This is my little corner of the internet. Part notebook, part journal: a home for thoughts on technology, everyday life, and the interesting bits in between.</p><p>No big promises. Just a few stories, shared at a human pace.</p></div><Link className="read-link inline-flex items-center gap-2" to="/#writing">Explore the journal <ArrowRight size={16} /></Link></section> }
function NotFound() { return <section className="article"><h1>A little lost?</h1><p className="article-deck">This page doesn’t exist.</p><Link className="read-link inline-flex" to="/">Back to the journal →</Link></section> }

function App() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('journal-theme') === 'dark' } catch { return false } })
  const location = useLocation()
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('journal-theme', dark ? 'dark' : 'light') } catch { /* Theme still works without storage. */ } }, [dark])
  useEffect(() => {
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView())
    else window.scrollTo(0, 0)
    if (!location.pathname.startsWith('/posts/')) document.title = `${location.pathname === '/about' ? 'About Charlie' : location.pathname === '/write' ? 'Writing desk' : location.pathname === '/signin' ? 'Author sign in' : 'Charlie’s journal'} — A little human`
  }, [location])
  return <div className="shell"><a href="#main" className="skip-link">Skip to content</a><header className="header flex items-center justify-between"><Link to="/" className="brand flex items-center gap-2"><Robot /><span>charlie<span className="accent">.</span></span></Link><nav className="flex items-center" aria-label="Main navigation"><NavLink to="/" end>Journal</NavLink><NavLink to="/about">About</NavLink><span className="nav-divider" /><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></nav></header><main id="main"><Routes><Route path="/" element={<Home />} /><Route path="/posts/:slug" element={<Article />} /><Route path="/about" element={<About />} /><Route path="/signin" element={<SignIn />} /><Route path="/write" element={<WritePost />} /><Route path="*" element={<NotFound />} /></Routes></main><footer className="footer flex items-center justify-end"><AuthorLink /></footer></div>
}

const convexUrl = import.meta.env.VITE_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary>{convex ? <ConvexAuthProvider client={convex}><BrowserRouter><App /></BrowserRouter></ConvexAuthProvider> : <div className="shell"><section className="article"><h1>The journal is getting ready.</h1><p className="article-deck">Please check back shortly.</p></section></div>}</ErrorBoundary></React.StrictMode>,
)
