import { Component } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function Robot({ className = '' }: { className?: string }) {
  return <img className={`robot ${className}`} src="/images/robot.png" alt="Pixel robot" />
}

export function formatDate(timestamp: number, short = false) {
  return new Intl.DateTimeFormat('en-GB', {
    day: short ? '2-digit' : 'numeric', month: short ? 'short' : 'long', year: 'numeric', timeZone: 'Europe/London',
  }).format(timestamp)
}

export function Meta({ post }: { post: { category: string; publishedAt: number; readingMinutes: number } }) {
  return <div className="meta flex flex-wrap items-center gap-3">
    <span className="category">{post.category}</span>
    <time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt)}</time>
    <span aria-hidden="true">·</span><span>{post.readingMinutes} min read</span>
  </div>
}

export function PostBody({ content }: { content: string }) {
  return <div className="prose">{content.split(/\n\s*\n/u).map((paragraph, index) => <p key={index} className="post-paragraph">{paragraph}</p>)}</div>
}

export function Loading({ message = 'Opening the journal…' }: { message?: string }) {
  return <div className="empty-state" role="status"><span className="accent">✳</span><p>{message}</p></div>
}

export function BackLink() {
  return <Link to="/#writing" className="back-link inline-flex items-center gap-2"><ArrowLeft size={15} /> All writing</Link>
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="shell"><section className="article"><h1>A small interruption.</h1><p className="article-deck">The journal couldn’t load. Please try again in a moment.</p><button className="primary-button" onClick={() => window.location.reload()}>Try again</button></section></div>
    return this.props.children
  }
}
