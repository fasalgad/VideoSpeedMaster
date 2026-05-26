// Listener para mensajes desde el popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'hasVideos') {
    const hasVideos = document.querySelectorAll('video').length > 0 ||
                      (() => {
                        try {
                          const iframes = document.querySelectorAll('iframe, embed[type="text/html"]');
                          for (let frame of iframes) {
                            try {
                              const frameDoc = frame.contentDocument || frame.contentWindow.document;
                              if (frameDoc && frameDoc.querySelectorAll('video').length > 0) {
                                return true;
                              }
                            } catch (e) {}
                          }
                        } catch (e) {}
                        return false;
                      })();
    sendResponse({ hasVideos });
  }
});
