import React, { forwardRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import Mermaid from 'react-mermaid2';
import 'highlight.js/styles/github-dark.css';
import "../css/MarkdownEditor.css";

const Preview = forwardRef(({ content }, ref) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000); // Reset after 2 seconds
    });
  };

  return (
    <div className="markdown-preview" ref={ref}>
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match?.[1];

            if (lang === 'mermaid') {
              try {
                return (
                  <pre style={{ background: 'transparent !important', padding: '12px', borderRadius: '6px' }}>
                    <Mermaid chart={String(children).trim()} />
                  </pre>
                );
              } catch (error) {
                console.error('Mermaid render error:', error);
                return <pre className="mermaid-error">Mermaid render error</pre>;
              }
            }

            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }

            const codeString = String(children).trim();

            return (
              <>
                <div className="btnbg">
                  <button
                    className="copy-button"
                    onClick={() => handleCopy(codeString)}
                  >
                    {copiedCode === codeString ? 'Coped!' : 'Copy'}
                  </button>
                </div>
                <pre className={className} style={{ background: 'var(--bg-panel)', padding: '12px', borderRadius: '6px' }}>
                  <code {...props}>{children}</code>
                </pre>
              </>
            );
          },
          img: ({ node, ...props }) => (
            <img {...props} style={{ maxWidth: '100%', borderRadius: '6px', marginTop: '8px' }} />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                console.log("🧲 Link tıklandı:", href);
                if (window.api?.openExternalLink) {
                  window.api.openExternalLink(href);
                } else {
                  console.warn("⚠️ openExternalLink preload içinde tanımsız");
                }
              }}
              style={{ color: 'var(--primary)', cursor: 'pointer' }}
            >
              {children}
            </a>
          ),
        }}
      />
    </div>
  );
});

export default Preview;


