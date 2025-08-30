export function prompt(message, value) {
  let promptURL = browser.runtime.getURL('prompt-popup.html');

  return new Promise(function(resolve, reject) {
    browser.windows.create({
      url: promptURL,
      type: 'popup',
    }).then(function(w) {
      function handler(msg, sender) {
        browser.runtime.onMessage.removeListener(handler);

        resolve(msg.value);
      }

      browser.runtime.onMessage.addListener(handler);
    }, function(e) {
      reject(e);
    });
  });
}
