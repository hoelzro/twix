import { annotationStore } from './dummy-store.js';

const FOLLOW_UP_ID = 'follow-up';
const HIGHLIGHT_ID = 'highlight';
const ANNOTATE_ID  = 'annotate';

browser.menus.create({
  id: FOLLOW_UP_ID,
  title: 'Follow Up',
  contexts: ['link'],
});

browser.menus.create({
  id: HIGHLIGHT_ID,
  title: 'Highlight',
  contexts: ['selection'],
});

browser.menus.create({
  id: ANNOTATE_ID,
  title: 'Annotate',
  contexts: ['selection'],
});

browser.menus.onClicked.addListener(function(info, tab) {
  switch(info.menuItemId) {
    case FOLLOW_UP_ID:
      annotationStore.addFollowUp({
        targetURL: info.linkUrl,
      });
      break;
    case HIGHLIGHT_ID:
      annotationStore.addAnnotation({
        annotation: null,
        selection: info.selectionText,
      });
      break;
    case ANNOTATE_ID:
      let promptURL = browser.runtime.getURL('prompt.html');
      browser.windows.create({
        url: promptURL,
        type: 'popup',
      }).then(function(w) {
        function handler(msg, sender) {
          browser.runtime.onMessage.removeListener(handler);
          browser.windows.remove(sender.tab.windowId);

          let annotation = msg.value;
          annotationStore.addAnnotation({
            annotation,
            selection: info.selectionText,
          });
        }

        browser.runtime.onMessage.addListener(handler);
      }, function(e) {
        console.error('failed to create prompt window', e);
      });
      break;
  }
});
