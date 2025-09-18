// src/components/Preview.jsx
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import Mermaid from 'react-mermaid2';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';
import '../css/MarkdownEditor.css';

import "../css/Editor/katex.css"
import "../css/Editor/pre.css"
import "../css/Editor/tables.css"
import "../css/Editor/blockquote.css"

const Preview = forwardRef(({ content }, ref) => {
  const hostRef = useRef(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const resolveAssetSrc = (src) => {
    if (!src) return src;
    const s = String(src);
    if (/^(https?:)?\/\//i.test(s) || s.startsWith('data:')) return s;
    const base = import.meta.env.BASE_URL || '/';
    return `${base}${s.replace(/^\//, '')}`;
  };

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(hostRef.current);
      } else if (typeof ref === 'object') {
        ref.current = hostRef.current;
      }
    }
  }, [ref]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleImageClick = (src) => {
    const lightbox = document.createElement('div');
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.width = '100%';
    lightbox.style.height = '100%';
    lightbox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    lightbox.style.display = 'flex';
    lightbox.style.justifyContent = 'center';
    lightbox.style.alignItems = 'center';
    lightbox.style.zIndex = '1000';
    lightbox.onclick = () => document.body.removeChild(lightbox);

    const img = document.createElement('img');
    img.src = src;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

    lightbox.appendChild(img);
    document.body.appendChild(lightbox);
  };

  // Toggle sanitization: set to true once a custom schema allows relative URLs
  const USE_SANITIZE = false;

  return (
    <div
      className="markdown-preview"
      ref={hostRef}
      style={{
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
        color: 'var(--text-color)',
        backgroundColor: 'var(--bg-color)',
        transition: 'color 0.3s, background-color 0.3s',
        padding: '20px',
        margin: '20px auto',
        maxWidth: '800px',
      }}
    >
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          ...(USE_SANITIZE ? [rehypeSanitize] : []),
          [rehypeKatex, { strict: 'ignore' }],
          rehypeHighlight,
        ]}
        components={{
          code({ inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];

            // Always render inline code as an inline element
            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }

            // Mermaid fenced block (non-inline only)
            if (lang === 'mermaid') {
              try {
                return (
                  <div style={{ background: 'transparent', padding: '12px', borderRadius: '6px' }}>
                    <Mermaid chart={String(children).trim()} />
                  </div>
                );
              } catch (error) {
                console.error('Mermaid render error:', error);
                return <div className="mermaid-error">Mermaid render error</div>;
              }
            }

            const codeString = String(children).trim();

            // Non-inline, regular code block
            return (
              <div style={{ position: 'relative', margin: '1em 0', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
                <div className="btnbg" style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2 }}>
                  <button
                    className="copy-button"
                    onClick={() => handleCopy(codeString)}
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                  >
                    {copiedCode === codeString ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className={className} style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', overflowX: 'auto' }}>
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          p: ({ children }) => {
            const blockTags = new Set(['div', 'pre', 'table', 'blockquote', 'ul', 'ol', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

            const hasBlockDesc = (node) => {
              if (!React.isValidElement(node)) return false;
              if (typeof node.type === 'string') {
                if (blockTags.has(node.type)) return true;
                if (node.type === 'code') {
                  const cls = node.props?.className || '';
                  if (typeof cls === 'string' && cls.includes('language-')) return true;
                }
              }
              const childNodes = node.props?.children;
              if (!childNodes) return false;
              const arr = React.Children.toArray(childNodes);
              return arr.some((n) => hasBlockDesc(n));
            };

            const kids = React.Children.toArray(children);
            const out = [];
            let inlineBuf = [];

            const flushInline = () => {
              if (inlineBuf.length) {
                out.push(<p key={`p-${out.length}`} style={{ margin: '1em 0' }}>{inlineBuf}</p>);
                inlineBuf = [];
              }
            };

            for (let i = 0; i < kids.length; i++) {
              const k = kids[i];
              const isBlockLike = React.isValidElement(k) && (hasBlockDesc(k) || (typeof k.type === 'string' && blockTags.has(k.type)));
              if (isBlockLike) {
                flushInline();
                out.push(k);
              } else {
                inlineBuf.push(k);
              }
            }
            flushInline();

            // If everything was inline, return a single <p>. Otherwise, return a fragment of mixed nodes
            if (out.length === 1 && out[0].type === 'p') return out[0];
            return <>{out}</>;
          },
          h1: ({ children }) => <h1 style={{ fontSize: '2em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontSize: '1.75em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: '1.5em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h3>,
          h4: ({ children }) => <h4 style={{ fontSize: '1.25em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h4>,
          h5: ({ children }) => <h5 style={{ fontSize: '1em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h5>,
          h6: ({ children }) => <h6 style={{ fontSize: '0.875em', margin: '1em 0', fontWeight: 'bold' }}>{children}</h6>,
          img: ({ src, alt, ...props }) => {
            const original = String(src || '');
            const resolved = resolveAssetSrc(original);
            const pathNoSlash = original.replace(/^\//, '');
            const handleError = (e) => {
              const img = e.currentTarget;
              const attempt = parseInt(img.dataset.attempt || '0', 10);
              if (attempt === 0) {
                img.dataset.attempt = '1';
                img.src = `/${pathNoSlash}`;
              } else if (attempt === 1) {
                img.dataset.attempt = '2';
                img.src = pathNoSlash;
              }
            };
            return (
              <img
                src={resolved}
                alt={alt}
                {...props}
                style={{ maxWidth: '100%', borderRadius: '6px', marginTop: '8px', cursor: 'pointer' }}
                loading="lazy"
                decoding="async"
                data-attempt="0"
                onError={handleError}
                onClick={() => handleImageClick(resolved)}
              />
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (window.api?.openExternalLink) {
                  window.api.openExternalLink(href);
                } else {
                  console.warn('openExternalLink preload içinde tanımsız:', href);
                }
              }}
              style={{ color: 'var(--primary)', cursor: 'pointer' }}
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => {
            const mapAlias = (k) => {
              const key = (k || '').toLowerCase();
              if (key === 'info' || key === 'succes') return 'success';
              return key;
            };
            const kinds = new Set(['success', 'warning', 'danger', 'primary']);
            let variant = null;
            const stripMarkerRegex = /^\s*\[!(success|warning|danger|primary|info|succes)\]\s*/i;

            const stripAtStart = (node, atStart = true) => {
              if (!atStart) return [node, false];

              if (typeof node === 'string') {
                const m = stripMarkerRegex.exec(node);
                if (m) {
                  const mapped = mapAlias(m[1]);
                  if (kinds.has(mapped)) {
                    variant = mapped;
                  }
                  const rest = node.replace(stripMarkerRegex, '');
                  const hasText = rest.trim().length > 0;
                  return [rest, !hasText];
                }
                if (node.trim().length === 0) return [node, true];
                return [node, false];
              }

              if (React.isValidElement(node)) {
                const c = React.Children.toArray(node.props?.children || []);
                const newChildren = [];
                let stillAtStart = atStart;
                for (let i = 0; i < c.length; i++) {
                  const [newChild, nextAtStart] = stripAtStart(c[i], stillAtStart);
                  newChildren.push(newChild);
                  stillAtStart = nextAtStart;
                }
                return [React.cloneElement(node, node.props, newChildren), stillAtStart];
              }

              return [node, atStart];
            };

            const kids = React.Children.toArray(children);
            let atStart = true;
            const transformed = kids.map((k) => {
              const [n, nextAtStart] = stripAtStart(k, atStart);
              atStart = nextAtStart;
              return n;
            });

            const cls = variant ? `blockquote-${variant}` : undefined;
            return <blockquote className={cls}>{transformed}</blockquote>;
          },
        }}
      />
    </div>
  );
});

export default Preview;


