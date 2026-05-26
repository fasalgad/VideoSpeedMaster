document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url).hostname;
    document.getElementById('domainText').innerText = url;

    chrome.storage.sync.get([url, 'theme'], (result) => {
      updateUI(result[url]);
      updateThemeBtn(result.theme || 'dark');
    });

    // Toggle velocidad en dominio
    document.getElementById('toggleBtn').onclick = () => {
      chrome.storage.sync.get([url], (result) => {
        const newState = !result[url];
        chrome.storage.sync.set({ [url]: newState }, () => {
          updateUI(newState);
          chrome.tabs.reload(tabs[0].id);
        });
      });
    };

    // Toggle tema
    document.getElementById('themeBtn').onclick = () => {
      chrome.storage.sync.get(['theme'], (result) => {
        const newTheme = (result.theme || 'dark') === 'dark' ? 'light' : 'dark';
        chrome.storage.sync.set({ theme: newTheme }, () => {
          updateThemeBtn(newTheme);
          chrome.tabs.reload(tabs[0].id);
        });
      });
    };

    // Botón SCAN: detectar videos y activar automáticamente
    document.getElementById('scanBtn').onclick = () => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'hasVideos' }, (response) => {
        if (chrome.runtime.lastError) {
          alert('No se pudo detectar videos en esta pestaña');
          return;
        }

        if (response && response.hasVideos) {
          chrome.storage.sync.set({ [url]: true }, () => {
            updateUI(true);
            chrome.tabs.reload(tabs[0].id);
          });
        } else {
          alert('No se encontraron videos en esta página');
        }
      });
    };
  });

  function updateUI(active) {
    const btn = document.getElementById('toggleBtn');
    btn.innerText = active ? "Desactivar en esta web" : "Activar en esta web";
    btn.className = active ? "btn-off" : "btn-on";
  }

  function updateThemeBtn(theme) {
    const btn = document.getElementById('themeBtn');
    btn.innerText = theme === 'dark' ? 'Cambiar a Oscuro' : 'Cambiar a Claro';
  }
});