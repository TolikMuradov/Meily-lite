export default function MarkdownEditor({ content, setContent }) {
    return (
      <textarea
        className="textarea markdown-textarea"
        value={content}
        placeholder="Not içeriği..."
        onChange={(e) => setContent(e.target.value)}
      />
    );
  }
  