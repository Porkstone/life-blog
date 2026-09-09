import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { ArrowUpRight, ArrowLeft, ArrowRight, Moon, Sun } from 'lucide-react'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/lora/400.css'
import '@fontsource/lora/500.css'
import '@fontsource/lora/400-italic.css'
import './style.css'

const posts = [
  { slug: 'making-room', title: 'Making room for the things that matter.', category: 'Life', date: '8 September 2026', shortDate: '08 Sep 2026', time: '4 min read', excerpt: 'On slowing down, paying attention, and finding a little more meaning in the everyday.', paragraphs: [
    'Lately, I’ve been noticing how quickly a day can fill up. A few messages, a small task that becomes a big one, another tab opened with the best of intentions. Before I know it, the light outside has changed and I can’t quite remember what I was hoping to do.',
    'There’s nothing particularly dramatic about it. Life is full. But I’ve started wondering whether full and meaningful are always the same thing.',
    'Last Sunday, I left my phone at home and went for a walk. No route, no step count, no podcast to make the time productive. Just a walk along the river, with a coffee that went cold before I finished it.',
    'I noticed a bookshop I must have passed a hundred times. Someone was painting their front door a very brave shade of yellow. A dog was having what looked like the best morning of its life. Small things, but they stayed with me.',
    'I don’t think making room means a grand reset. For me, it means leaving a little space between things. Reading a few pages before reaching for a screen. Cooking something slowly. Calling someone without having a reason.',
    'I’m still figuring it out. Some days are as busy and distracted as ever. But I’m learning that attention is something you can practise, and that an ordinary day is often more interesting than it first appears.',
    'Maybe that’s part of why I’m starting this journal. A place to put the things I notice. A small reminder to keep noticing.'
  ] },
  { slug: 'building-for-the-fun-of-it', title: 'Building things for the fun of it', category: 'Technology', date: '2 September 2026', shortDate: '02 Sep 2026', time: '5 min read', excerpt: 'Not every side project needs a business plan. Sometimes curiosity is enough.', paragraphs: ['There is a particular kind of joy in starting a project with no clear destination. You have an idea, a free evening, and just enough knowledge to get yourself into trouble.', 'Somewhere along the way, I started judging every idea by what it could become. Was it useful? Could it grow? Would anyone actually want it? Sensible questions, perhaps, but not always the right ones.', 'The best things I’ve learned often came from making something wonderfully unnecessary. A tiny tool that saves ten seconds. A website for an imaginary shop. Something that simply made me smile.', 'This week I’m trying to follow that feeling again. Build a small thing. See what happens. Let the process be enough.'] },
  { slug: 'london-on-foot', title: 'A different London, on foot', category: 'Life', date: '24 August 2026', shortDate: '24 Aug 2026', time: '3 min read', excerpt: 'Taking the long way home, and remembering why I love this city.', paragraphs: ['The quickest route home is rarely the most interesting. I know that, and yet I usually take it anyway.', 'This time I turned left where I normally turn right. Ten minutes later I was in a street I didn’t recognise, watching the late afternoon light work its way across a row of old brick houses.', 'London is good at this. You can spend years in it and still find a little pocket that feels entirely new. A courtyard, a market, a view between two buildings.', 'I got home an hour late. It felt like time well spent.'] },
  { slug: 'a-place-of-my-own', title: 'A small corner of the internet', category: 'Notes', date: '16 August 2026', shortDate: '16 Aug 2026', time: '2 min read', excerpt: 'Why I’m starting a blog, and what you might find here.', paragraphs: ['I wanted somewhere simple to write. A place without a feed to keep up with or a number to chase. Somewhere an unfinished thought could become a conversation.', 'So here we are. A small corner of the internet for notes on technology, life, and whatever catches my attention along the way.', 'I don’t have a publishing schedule or a grand plan. Just a few things I’d like to think through, and the hope that writing them down might help.', 'If you’ve found your way here, welcome. Make yourself at home.'] },
]

function Robot({ className = '' }: { className?: string }) { return <img className={`robot ${className}`} src="/images/robot.png" alt="Pixel robot" /> }
function Meta({ post }: { post: typeof posts[number] }) { return <div className="meta flex flex-wrap items-center gap-3"><span className="category">{post.category}</span><span>{post.date}</span><span className="meta-dot">·</span><span>{post.time}</span></div> }

function Home() {
  const [filter, setFilter] = useState('All posts')
  return <>
    <section className="intro"><div className="eyebrow flex items-center gap-2"><span className="status-dot" /> A PERSONAL JOURNAL BY CHARL</div><h1>A little tech.<br />A little life. <em>A little human.</em></h1><p>Thoughts on the things I build, the places I go,<br className="hidden sm:block" /> and what I’m learning along the way.</p></section>
    <figure className="skyline"><img src="/images/london.png" alt="A playful black and white London skyline, with robots climbing its landmarks" /><figcaption>LONDON, EARTH <span>—</span> MOSTLY HUMAN.</figcaption></figure>
    <section className="featured"><div><div className="eyebrow accent">THE LATEST ENTRY</div><Link className="feature-link" to={`/posts/${posts[0].slug}`}><h2>{posts[0].title}</h2></Link><p>{posts[0].excerpt}</p><Meta post={posts[0]} /><Link className="read-link inline-flex items-center gap-2" to={`/posts/${posts[0].slug}`}>Read the story <ArrowUpRight size={17} /></Link></div><Link to={`/posts/${posts[0].slug}`} className="robot-card" aria-label="Read Making room for the things that matter"><span className="card-top">A NOTE TO SELF <span>001</span></span><Robot /><span className="card-bottom">Less noise. More life.</span></Link></section>
    <section className="writing" id="writing"><div className="writing-heading flex flex-wrap items-center justify-between gap-4"><h2>All writing<span> / 04</span></h2><div className="filters flex flex-wrap gap-1" aria-label="Filter posts">{['All posts', 'Life', 'Technology', 'Notes'].map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={filter === item ? 'selected' : ''}>{item}</button>)}</div></div><div aria-live="polite">{posts.filter(post => filter === 'All posts' || post.category === filter).map(post => <Link className="post-row" key={post.slug} to={`/posts/${post.slug}`}><time>{post.shortDate}</time><div><h3>{post.title}</h3><p>{post.excerpt}</p><span className="mobile-meta">{post.category} · {post.time}</span></div><span className="row-category">{post.category}</span><ArrowUpRight className="row-arrow" size={19} /></Link>)}</div></section>
    <aside className="hello flex items-center gap-5"><Robot /><div><h3>A person behind the pixels.</h3><p>I’m Charl. A curious human who likes building things and writing them down.</p><Link to="/about" className="inline-flex items-center gap-1">A little more about me <ArrowRight size={14} /></Link></div></aside>
  </>
}

function Article() {
  const { slug } = useParams()
  const post = posts.find(item => item.slug === slug)
  if (!post) return <NotFound />
  const next = posts[(posts.indexOf(post) + 1) % posts.length]
  return <article className="article"><Link to="/#writing" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> All writing</Link><Meta post={post} /><h1>{post.title}</h1><p className="article-deck">{post.excerpt}</p><div className="author flex items-center gap-3"><Robot /><span>Written by Charl <span>• Sample entry</span></span></div><div className="prose">{post.paragraphs.map((paragraph, index) => <React.Fragment key={paragraph}>{index === 3 && post.slug === 'making-room' && <blockquote>“An ordinary day is often more interesting than it first appears.”</blockquote>}<p>{paragraph}</p></React.Fragment>)}</div><div className="article-end">✳</div><Link to={`/posts/${next.slug}`} className="next-post"><span className="eyebrow">READ ANOTHER STORY</span><h2>{next.title} <ArrowRight size={22} /></h2></Link></article>
}

function About() { return <section className="about article"><Link to="/" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> Back to the journal</Link><div className="eyebrow accent">HELLO THERE</div><h1>A person behind<br />the pixels.</h1><div className="about-robot"><Robot /></div><div className="prose"><p>I’m Charl. A curious human who likes building things, exploring London, and writing down what I learn along the way.</p><p>This is my little corner of the internet. Part notebook, part journal: a home for thoughts on technology, everyday life, and the interesting bits in between.</p><p>No big promises. Just a few stories, shared at a human pace.</p></div><p className="sample-note">Placeholder bio for this design preview.</p><Link className="read-link inline-flex items-center gap-2" to="/#writing">Explore the journal <ArrowRight size={16} /></Link></section> }
function NotFound() { return <section className="article"><h1>A little lost?</h1><p>This page doesn’t exist.</p><Link className="read-link" to="/">Back to the journal →</Link></section> }

function App() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem('journal-theme') === 'dark' } catch { return false } })
  const location = useLocation()
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('journal-theme', dark ? 'dark' : 'light') } catch { /* Theme still works without storage. */ } }, [dark])
  useEffect(() => { if (location.hash) { requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView()) } else window.scrollTo(0, 0); const post = posts.find(p => location.pathname === `/posts/${p.slug}`); document.title = `${post?.title || (location.pathname === '/about' ? 'About Charl' : 'A little human')} — Charl’s journal` }, [location])
  return <div className="shell"><a href="#main" className="skip-link">Skip to content</a><header className="header flex items-center justify-between"><Link to="/" className="brand flex items-center gap-2"><Robot /><span>charl<span className="accent">.</span></span></Link><nav className="flex items-center" aria-label="Main navigation"><NavLink to="/" end>Journal</NavLink><NavLink to="/about">About</NavLink><span className="nav-divider" /><button className="theme-toggle" onClick={() => setDark(!dark)} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button></nav></header><main id="main"><Routes><Route path="/" element={<Home />} /><Route path="/posts/:slug" element={<Article />} /><Route path="/about" element={<About />} /><Route path="*" element={<NotFound />} /></Routes></main><footer className="footer flex flex-wrap items-center justify-between gap-3"><span>© {new Date().getFullYear()} Charl <span className="footer-dot">·</span> A little corner of the internet.</span><span>Made with curiosity <span className="accent">✳</span></span></footer></div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>)
