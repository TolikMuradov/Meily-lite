// src/components/Preview.jsx
import React, { forwardRef, useEffect, useRef, useState, useMemo } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle, FaStickyNote, FaLightbulb, FaBolt, FaExclamationCircle } from 'react-icons/fa';
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
import "../css/Editor/tasks.css"

const Preview = forwardRef(({ content, onToggleTask }, ref) => {
  const hostRef = useRef(null);
  const [copiedCode, setCopiedCode] = useState(null);
  // Pre-scan lines synchronously with useMemo so first paint has data
  const taskLineMap = useMemo(() => {
    const map = {};
    const lines = content.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const m = /^(\s*[-*+]\s*\[( |x|X)\])/.exec(lines[i]);
      if (m) map[i] = { checked: /x|X/.test(m[2]) };
    }
    return map;
  }, [content]);

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
  remarkPlugins={[[remarkGfm, { taskList: true }], remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          ...(USE_SANITIZE ? [rehypeSanitize] : []),
          [rehypeKatex, { strict: 'ignore' }],
          rehypeHighlight,
        ]}
        components={{
          // Suppress native GFM checkbox inputs; we render our own.
          input: ({ node, ...inputProps }) => {
            if (inputProps.type === 'checkbox') {
              return null; // hide default checkbox
            }
            return <input {...inputProps} />;
          },
          li: ({ node, children, ...props }) => {
            const lineGuess = node?.position?.start?.line ? (node.position.start.line - 1) : -1;
            const prescanned = lineGuess >= 0 ? taskLineMap[lineGuess] : undefined;
            const isTask = typeof node?.checked === 'boolean' || !!prescanned;
            const baseClass = props.className ? props.className + ' ' : '';

            const renderTask = (checked, contentChildren, meta) => {
              // meta: { line }
              return (
                <li
                  {...props}
                  data-task
                  className={baseClass + 'task-list-item'}
                  style={{ listStyle: 'none', margin: '4px 0', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                  onClick={(e) => {
                    if (!onToggleTask) return;
                    e.stopPropagation();
                    onToggleTask(meta.line, !checked);
                  }}
                >
                  <span
                    className={"task-checkbox" + (checked ? ' checked' : '')}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        onToggleTask?.(meta.line, !checked);
                      }
                    }}
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid var(--border, #555)',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: checked ? 'var(--primary, #5b9cf2)' : 'transparent',
                      color: checked ? '#fff' : 'transparent',
                      transition: 'background .15s'
                    }}
                  >
                    ✓
                  </span>
                  <span style={{ flex: 1, textDecoration: checked ? 'line-through' : 'none', opacity: checked ? 0.7 : 1 }}>{contentChildren}</span>
                </li>
              );
            };

            if (isTask) {
              // Remove any auto-rendered native checkbox <input> that remark-gfm might have inserted
              const stripNative = (nodes) => nodes.filter(n => !(React.isValidElement(n) && n.type === 'input'));
              const flat = React.Children.toArray(children).map((c, i) => {
                if (React.isValidElement(c) && c.type === 'p') {
                  const inner = stripNative(React.Children.toArray(c.props.children));
                  return <React.Fragment key={i}>{inner}</React.Fragment>;
                }
                return c;
              });
              // Determine line index by finding preceding position info if available (node.position from mdast)
              const line = lineGuess;
              const checked = typeof node?.checked === 'boolean' ? node.checked : !!prescanned?.checked;
              // If fallback (no node.checked) and first text still begins with [ ] remove it
              if (!node.checked && prescanned) {
                // Clean leading marker from first string fragment if present
                if (flat.length) {
                  const first = flat[0];
                  if (typeof first === 'string') {
                    flat[0] = first.replace(/^\[( |x|X)\]\s+/, '');
                  }
                }
              }
              return renderTask(checked, flat, { line });
            }

            // Fallback: detect literal "[ ]" or "[x]" at start when GFM didn't mark it
            const rawChildren = React.Children.toArray(children).filter(c => !(React.isValidElement(c) && c.type === 'input'));
            if (rawChildren.length) {
              // If first element is a <p> unwrap its children for inspection
              let first = rawChildren[0];
              let inspectNodes = [];
              if (React.isValidElement(first) && first.type === 'p') {
                inspectNodes = React.Children.toArray(first.props.children);
              } else {
                inspectNodes = [first];
              }
              if (inspectNodes.length) {
                const firstText = inspectNodes
                  .filter(n => typeof n === 'string')
                  .join('')
                  .trimStart();
                const m = /^(\[( |x|X)\])\s+/.exec(firstText);
                if (m) {
                  const isChecked = /x/i.test(m[1]);
                  // Rebuild content without the leading marker token
                  let consumed = false;
                  const rebuilt = inspectNodes.map((n, idx) => {
                    if (typeof n === 'string') {
                      if (!consumed) {
                        consumed = true;
                        return n.replace(/^(\[( |x|X)\])\s+/, '');
                      }
                      return n;
                    }
                    return n;
                  });
                  const restChildren = [
                    ...(React.isValidElement(first) && first.type === 'p'
                      ? [<React.Fragment key="rebuilt">{rebuilt}</React.Fragment>]
                      : rebuilt),
                    ...rawChildren.slice(1)
                  ];
                  const line = node.position?.start?.line ? (node.position.start.line - 1) : -1;
                  return renderTask(isChecked, restChildren, { line });
                }
              }
            }

            return <li {...props}>{children}</li>;
          },
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
              if (key === 'succes') return 'success';
              if (key === 'info') return 'primary'; // legacy mapping
              if (key === 'note') return 'note';
              if (key === 'tip') return 'tip';
              if (key === 'important') return 'important';
              if (key === 'warning') return 'warning';
              if (key === 'caution') return 'caution';
              return key;
            };
            // Supported variants (GFM alerts + existing)
            const kinds = new Set(['success', 'warning', 'danger', 'primary', 'note', 'tip', 'important', 'caution']);
            let variant = null;
            const stripMarkerRegex = /^\s*\[!(success|warning|danger|primary|info|succes|note|tip|important|caution)\]\s*/i;

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
            const variantLabelMap = {
              success: 'Success',
              warning: 'Warning',
              danger: 'Danger',
              primary: 'Info',
              note: 'Note',
              tip: 'Tip',
              important: 'Important',
              caution: 'Caution'
            };
            const variantIconMap = {
              success: <FaCheckCircle />,
              warning: <FaExclamationTriangle />,
              danger: <FaTimesCircle />,
              primary: <FaInfoCircle />,
              note: <FaStickyNote />,
              tip: <FaLightbulb />,
              important: <FaBolt />,
              caution: <FaExclamationCircle />
            };
            if (!variant) {
              return <blockquote className={cls}>{transformed}</blockquote>;
            }
            const label = variantLabelMap[variant] || variant;
            const icon = variantIconMap[variant] || <FaInfoCircle />;
            return (
              <blockquote className={cls} data-variant={variant}>
                <div className="callout-header">
                  <span className="callout-icon">{icon}</span>
                  <span className="callout-label">{label}</span>
                </div>
                <div className="callout-body">{transformed}</div>
              </blockquote>
            );
          },
        }}
      />
    </div>
  );
});

export default Preview;


