import ReactMarkdown from 'react-markdown';

export default function Preview({ note }) {
  if (!note) return <div className="preview">Not seçilmedi</div>;

  const fixSrcPath = (src) => {
    try {
      if (!src) return '';
      // file:///C:\... => file:///C:/... ve boşluk encode
      const windowsFixed = src
        .replace(/^file:\/+/, 'file:///') // tek file:// olsun
        .replace(/\\/g, '/')             // ters slash düzelt
        .replace(/ /g, '%20');           // boşlukları encode et
      return windowsFixed;
    } catch {
      return '';
    }
  };

  return (
    <div className="preview">
      <ReactMarkdown
        components={{
          img: ({ node, ...props }) => {
            const src = fixSrcPath(props.src || '');
            return (
              <img
                src={src}
                alt={props.alt || 'resim'}
                style={{
                  maxWidth: '100%',
                  marginTop: '10px',
                  borderRadius: '6px'
                }}
                onError={(e) => {
                  e.target.alt = '❌ Resim yüklenemedi';
                  e.target.style.opacity = 0.4;
                }}
              />
            );
          }
        }}
      >
        {note.content}
      </ReactMarkdown>
    </div>
  );
}
