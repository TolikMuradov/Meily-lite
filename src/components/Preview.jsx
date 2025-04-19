import React, { forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import Mermaid from 'react-mermaid2';
import 'highlight.js/styles/github-dark.css';
import "../css/MarkdownEditor.css";

const Preview = forwardRef(({ content }, ref) => {
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
              return <Mermaid chart={String(children).trim()} />;
            }

            return (
              <pre className={className}>
                <code {...props}>{children}</code>
              </pre>
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
})

export default Preview;
