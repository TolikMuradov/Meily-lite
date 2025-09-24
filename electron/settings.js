// Dashboard Settings Logic
(() => {
  // Tabs
  const navItems = document.querySelectorAll('.settings-nav .nav-item');
  const panels = document.querySelectorAll('.tab-panel');
  navItems.forEach(btn => btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    navItems.forEach(b => b.classList.toggle('active', b === btn));
    panels.forEach(p => p.classList.toggle('active', p.id === `tab-${target}`));
  }));

  // Theme cards
  const themes = [
    { key:'TokyoNight', colors:['#24283b','#1a1b26','#7aa2f7','#bb9af7'] },
    { key:'Catppuccin', colors:['#1e1e2e','#313244','#89b4fa','#f5e0dc'] },
    { key:'Gruvbox', colors:['#282828','#3c3836','#fabd2f','#fb4934'] },
    { key:'OneDark', colors:['#282c34','#21252b','#61afef','#c678dd'] },
  { key:'Dracula', colors:['#282a36','#44475a','#bd93f9','#ff79c6'] },
  { key:'SolarizedDark', colors:['#002b36','#073642','#268bd2','#b58900'] },
  { key:'Nord', colors:['#2e3440','#3b4252','#88c0d0','#81a1c1'] },
  { key:'Monokai', colors:['#272822','#383830','#a6e22e','#f92672'] },
  { key:'Everforest', colors:['#2d353b','#3a444b','#a7c080','#e67e80'] }
  ];
  const themeCardsEl = document.getElementById('themeCards');
  const currentTheme = localStorage.getItem('selectedTheme') || 'TokyoNight';

  function renderThemeCards() {
    themeCardsEl.innerHTML = '';
    themes.forEach(t => {
      const card = document.createElement('button');
      card.className = 'theme-card';
      if (t.key === currentTheme) card.classList.add('active');
      // all themes now active
      card.innerHTML = `
        <div class="swatches">${t.colors.map(c=>`<span style="background:${c}"></span>`).join('')}</div>
        <div class="theme-name">${t.key}${t.placeholder ? ' *' : ''}</div>
      `;
      card.addEventListener('click', () => {
  // all themes selectable
        if (window.api && window.api.setTheme) {
          window.api.setTheme(t.key);
        } else {
          // fallback manual set
          localStorage.setItem('selectedTheme', t.key);
          document.documentElement.setAttribute('data-theme', t.key);
        }
        localStorage.setItem('selectedTheme', t.key);
        [...document.querySelectorAll('.theme-card')].forEach(c=>c.classList.remove('active'));
        card.classList.add('active');
      });
      themeCardsEl.appendChild(card);
    });
  }
  renderThemeCards();

  // Transparent toggle
  const checkbox = document.getElementById('transparentToggle');
  const saved = localStorage.getItem('transparentMode') === 'true';
  checkbox.checked = saved;
  checkbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    window.api.setTransparentMode(isChecked);
    localStorage.setItem('transparentMode', isChecked ? 'true' : 'false');
  });

  // Search animation toggle
  const searchAnimToggle = document.getElementById('searchAnimToggle');
  const searchAnimSaved = localStorage.getItem('pref.searchAnimation');
  searchAnimToggle.checked = searchAnimSaved == null ? true : (searchAnimSaved === 'true');
  searchAnimToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('pref.searchAnimation', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('pref-search-animation-changed', { detail: enabled }));
  });


  // Shortcuts sample
  const shortcutRows = document.getElementById('shortcutRows');
  const sampleShortcuts = [
    { action:'New Note', combo:'Ctrl + N', status:'core' },
    { action:'Save', combo:'Ctrl + S', status:'core' },
    { action:'Search', combo:'Ctrl + F', status:'core' },
    { action:'Toggle Preview', combo:'Ctrl + P', status:'core' },
    { action:'Command Palette', combo:'Ctrl + /', status:'core' }
  ];
  shortcutRows.innerHTML = sampleShortcuts.map(s=>`<tr><td>${s.action}</td><td>${s.combo}</td><td>${s.status}</td></tr>`).join('');
})();