// src/pages/Settings.jsx
export default function Settings() {
    return (
      <div className="settings-container">
        <h2>Ayarlar</h2>
        <div>
          <h3>Tema Seçimi</h3>
          <button onClick={() => window.api.setTheme('TokyoNight')}>TokyoNight</button>
          <button onClick={() => window.api.setTheme('Catppuccin')}>Catppuccin</button>
          <button onClick={() => window.api.setTheme('Gruvbox')}>Gruvbox</button>
          <button onClick={() => window.api.setTheme('OneDark')}>OneDark</button>
        </div>
        {/* Sonra font seçimi vb. ayarları buraya ekleyebiliriz */}
      </div>
    );
  }
  