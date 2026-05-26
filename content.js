(function() {
  const host = window.location.hostname;
  const PRESETS = [0.75, 1, 1.5, 2];

  const isTopWindow = window.top === window;

  const tryInitPanel = () => {
    chrome.storage.sync.get([host, 'theme'], (result) => {
      if (result[host]) {
        initControl(result.theme || 'dark');
      }
    });
  };

  if (isTopWindow) {
    tryInitPanel();
    
    // Escuchar cambios en storage (cuando el usuario activa/desactiva desde el popup)
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && changes[host]) {
        if (changes[host].newValue) {
          initControl(changes.theme?.newValue || 'dark');
        } else {
          const panel = document.getElementById('v-speed-panel');
          if (panel) panel.remove();
        }
      }
    });
  }

  function initControl(theme) {
    if (document.getElementById('v-speed-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'v-speed-panel';
    panel.className = theme;

    panel.innerHTML = `
      <button id="v-minimize" title="Minimizar">➖</button>
      <div class="v-content">
        <div class="v-header-row">
          <div class="v-header">⚡ Speed Master</div>
          <input id="v-number" type="number" min="0.25" max="16" step="0.25" value="1" title="Velocidad x" />
        </div>
        <div id="v-val">1x</div>
        <input type="range" id="v-range" min="0.25" max="3" step="0.25" value="1">
        <div class="presets" id="v-presets">
          ${PRESETS.map(p => `<button class="preset-btn" data-speed="${p}">${p}x</button>`).join('')}
        </div>

        <div class="v-small-controls">
          <button id="v-ref">🔄 Escanear</button>
          <button id="v-theme">🌙 Tema</button>
        </div>

        <div class="v-controls">
          <button id="v-back10">⏪</button>
          <button id="v-playpause">⏯</button>
          <button id="v-fwd10">⏩</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    const getFullscreenElement = () => {
      return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    };

    const movePanelToFullscreen = () => {
      const fullscreenEl = getFullscreenElement();
      if (fullscreenEl && fullscreenEl !== panel.parentElement) {
        fullscreenEl.appendChild(panel);
      } else if (!fullscreenEl && panel.parentElement !== document.body) {
        document.body.appendChild(panel);
      }
    };

    document.addEventListener('fullscreenchange', movePanelToFullscreen);
    document.addEventListener('webkitfullscreenchange', movePanelToFullscreen);
    document.addEventListener('mozfullscreenchange', movePanelToFullscreen);
    document.addEventListener('MSFullscreenChange', movePanelToFullscreen);

    movePanelToFullscreen();

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
    const playPauseBtn = panel.querySelector('#v-playpause');
    const backBtn = panel.querySelector('#v-back10');
    const fwdBtn = panel.querySelector('#v-fwd10');
    const numberInput = panel.querySelector('#v-number');
    const presetBtns = panel.querySelectorAll('.preset-btn');

    const applySpeed = (speed) => {
      range.value = Math.min(parseFloat(speed), 3);
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
      // Videos normales en el documento
      document.querySelectorAll('video').forEach(v => v.playbackRate = speed);
      
      // Videos en iframes e embeds de mismo origen
      const findVideosInFrames = (doc) => {
        try {
          doc.querySelectorAll('video').forEach(v => v.playbackRate = speed);
        } catch (e) {}
      };

      try {
        document.querySelectorAll('iframe, embed[type="text/html"]').forEach(frame => {
          try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (frameDoc) {
              findVideosInFrames(frameDoc);
              // Buscar iframes recursivamente dentro del iframe
              frameDoc.querySelectorAll('iframe, embed[type="text/html"]').forEach(nestedFrame => {
                try {
                  const nestedDoc = nestedFrame.contentDocument || nestedFrame.contentWindow.document;
                  if (nestedDoc) findVideosInFrames(nestedDoc);
                } catch (e) {}
              });
            }
          } catch (e) {
            // Ignorar frames de origen cruzado
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

    // Helper para acciones comunes sobre videos normales y en iframes/embeds
    const controlVideos = (fn) => {
      document.querySelectorAll('video').forEach(v => {
        try { fn(v); } catch (e) {}
      });

      const applyToFrames = (doc) => {
        try {
          doc.querySelectorAll('video').forEach(v => {
            try { fn(v); } catch (e) {}
          });
        } catch (e) {}
      };

      try {
        document.querySelectorAll('iframe, embed[type="text/html"]').forEach(frame => {
          try {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            if (frameDoc) {
              applyToFrames(frameDoc);
              // Recursivo para iframes anidados
              frameDoc.querySelectorAll('iframe, embed[type="text/html"]').forEach(nestedFrame => {
                try {
                  const nestedDoc = nestedFrame.contentDocument || nestedFrame.contentWindow.document;
                  if (nestedDoc) applyToFrames(nestedDoc);
                } catch (e) {}
              });
            }
          } catch (e) {
            // Ignorar frames de origen cruzado
          }
        });
      } catch (e) {}
    };

    // Devuelve true si existe algún video reproduciéndose
    const anyPlaying = () => {
      let playing = false;
      controlVideos(v => {
        try { if (!v.paused && !v.ended) playing = true; } catch(e) {}
      });
      return playing;
    };

    const updatePlayPauseUI = () => {
      const playing = anyPlaying();
      playPauseBtn.innerText = playing ? '⏸' : '▶';
      playPauseBtn.title = playing ? 'Pausar' : 'Reproducir';
    };

    range.oninput = () => { applySpeed(range.value); numberInput.value = parseFloat(range.value).toFixed(2); };
    refBtn.onclick = () => applySpeed(range.value);

    playPauseBtn.onclick = () => {
      if (anyPlaying()) {
        controlVideos(v => { try { v.pause(); } catch(e){} });
      } else {
        controlVideos(v => { try { v.play(); } catch(e){} });
      }
      updatePlayPauseUI();
    };

    backBtn.onclick = () => {
      controlVideos(v => { try { v.currentTime = Math.max(0, v.currentTime - 10); } catch(e){} });
    };

    fwdBtn.onclick = () => {
      controlVideos(v => { try { v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10); } catch(e){} });
    };

    numberInput.onchange = () => {
      let val = parseFloat(numberInput.value);
      if (isNaN(val)) return;
      val = Math.max(0.25, Math.min(16, val));
      applySpeed(val);
      numberInput.value = parseFloat(val).toFixed(2);
    };

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