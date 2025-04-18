import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

export default function MarkdownEditor({ content, setContent }) {
  return (
    <div className="markdown-editor">
      <CodeMirror
        value={content}
        height="100%"
        extensions={[markdown()]}
        theme={oneDark}
        onChange={(value) => setContent(value)}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
      />
    </div>
  );
}
