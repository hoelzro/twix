import { annotationStore } from './dummy-store.js';
import { prompt } from './prompt.js';

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

function addAsyncListener(event, listener) {
  event.addListener(function(...args) {
    listener.apply(this, args).catch(function(e) {
      console.error(e);
    });
  });
}

addAsyncListener(browser.menus.onClicked, async function(info, tab) {
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
      let annotation = await prompt('Annotation');
      annotationStore.addAnnotation({
        annotation,

        selection: info.selectionText,
      });

      break;
  }
});

browser.runtime.onMessage.addListener(function(request, sender, reply) {
  if(request.type == 'fetchAnnotations') {
    // XXX fetch them from store
    reply({
      annotations: [{
        text: 'on autopilot',
      }, {
        text: "don't outsource chaos",
      }],
    });
  }
});
