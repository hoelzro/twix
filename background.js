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
      prompt('Annotation').then(function(value) {
        annotationStore.addAnnotation({
          annotation: value,
          selection: info.selectionText,
        });
      }, function(e) {
        console.error('failed to get annotation from user', e);
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
