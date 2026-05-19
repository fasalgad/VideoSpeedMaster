(function() {
  const host = window.location.hostname;
  const PRESETS = [0.75, 1, 1.5, 2];

  chrome.storage.sync.get([host, 'theme'], (result) => {
    if (result[host]) initControl(result.theme || 'dark');
  });

  function initControl(theme) {
    if (document.getElementById('v-speed-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'v-speed-panel';
    panel.className = theme;

    panel.innerHTML = `
      <button id="v-minimize" title="Minimizar">➖</button>
      <div class="v-content">
        <div class="header">⚡ Speed Master</div>
        <div id="v-val">1x</div>
        <input type="range" id="v-range" min="0.25" max="3" step="0.25" value="1">
        <div class="presets" id="v-presets">
          ${PRESETS.map(p => `<button class="preset-btn" data-speed="${p}">${p}x</button>`).join('')}
        </div>
        <div class="controls">
          <button id="v-ref">🔄 Escanear</button>
          <button id="v-theme">🌙 Tema</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Cargar posición y estado guardados
    chrome.storage.sync.get([host + '_pos', host + '_minimized'], (result) => {
      if (result[host + '_pos']) {
        const pos = result[host + '_pos'];
        panel.style.left = pos.left + 'px';
        panel.style.top = pos.top + 'px';
      } else {
        panel.style.top = '20px';
        panel.style.right = '20px';
      }
      
      if (result[host + '_minimized']) {
        panel.classList.add('minimized');
        minimizeBtn.title = 'Expandir';
      }
    });

    const minimizeBtn = panel.querySelector('#v-minimize');
    const range = panel.querySelector('#v-range');
    const display = panel.querySelector('#v-val');
    const refBtn = panel.querySelector('#v-ref');
    const themeBtn = panel.querySelector('#v-theme');
    const presetBtns = panel.querySelectorAll('.preset-btn');

    const applySpeed = (speed) => {
      range.value = speed;
      display.innerText = parseFloat(speed).toFixed(2) + 'x';
      updatePresets(speed);
      applySpeedToAllVideos(parseFloat(speed));
    };

    const updatePresets = (speed) => {
      presetBtns.forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === parseFloat(speed));
      });
    };

    const applySpeedToAllVideos = (speed) => {
      // Videos normales
      document.querySelectorAll('video').forEach(v => v.playbackRate = speed);
      
      // Videos en iframes
      try {
        document.querySelectorAll('iframe').forEach(iframe => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
              iframeDoc.querySelectorAll('video').forEach(v => v.playbackRate = speed);
            }
          } catch (e) {
            // Ignorar iframes de origen cruzado
          }
        });
      } catch (e) {}

      // Observar nuevos videos
      const observer = new MutationObserver(() => {
        document.querySelectorAll('video:not([data-speed-applied])').forEach(v => {
          v.playbackRate = speed;
          v.setAttribute('data-speed-applied', 'true');
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });
    };

    range.oninput = () => applySpeed(range.value);
    refBtn.onclick = () => applySpeed(range.value);

    presetBtns.forEach(btn => {
      btn.onclick = () => applySpeed(btn.dataset.speed);
    });

    themeBtn.onclick = () => {
      const newTheme = panel.classList.contains('light') ? 'dark' : 'light';
      panel.classList.toggle('light');
      panel.classList.toggle('dark');
      chrome.storage.sync.set({ theme: newTheme });
    };

    minimizeBtn.onclick = (e) => {
      e.stopPropagation();
      panel.classList.toggle('minimized');
      minimizeBtn.title = panel.classList.contains('minimized') ? 'Expandir' : 'Minimizar';
      chrome.storage.sync.set({ [host + '_minimized']: panel.classList.contains('minimized') });
    };

    // --- Lógica Drag & Drop ---
    let isDragging = false, offset = { x: 0, y: 0 };
    
    panel.onmousedown = (e) => {
      // Si está minimizado, permitir arrastrar desde cualquier parte
      if (!panel.classList.contains('minimized')) {
        // Si está expandido, no arrastrar desde inputs o botones (excepto el de minimizar)
        if (e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && e.target.id !== 'v-minimize')) {
          return;
        }
      }
      
      isDragging = true;
      offset.x = e.clientX - panel.offsetLeft;
      offset.y = e.clientY - panel.offsetTop;
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;
      panel.style.left = (e.clientX - offset.x) + 'px';
      panel.style.top = (e.clientY - offset.y) + 'px';
      panel.style.right = 'auto';
    };

    document.onmouseup = () => {
      if (isDragging) {
        // Guardar posición
        chrome.storage.sync.set({
          [host + '_pos']: { left: panel.offsetLeft, top: panel.offsetTop }
        });
        isDragging = false;
      }
    };

    // Aplicar velocidad inicial
    applySpeed(1);
  }
})();