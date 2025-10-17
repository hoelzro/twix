import { annotationStore } from './local-storage-store.js';
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
    return listener.apply(this, args).catch(function(e) {
      console.error(e);
    });
  });
}

addAsyncListener(browser.menus.onClicked, async function(info, tab) {
  let newAnnotationId = null;

  switch(info.menuItemId) {
    case FOLLOW_UP_ID:
      await annotationStore.addFollowUp(tab.url, {
        targetURL: info.linkUrl,
      });
      break;
    case HIGHLIGHT_ID:
      {
        let selectionMetadata = await browser.tabs.sendMessage(tab.id, {
            type: 'getSelectionMetadata',
        }, {
          frameId: info.frameId,
        });

        newAnnotationId = await annotationStore.addAnnotation(tab.url, {
          annotation: null,
          text: info.selectionText,
          metadata: selectionMetadata,
        });
      }

      break;
    case ANNOTATE_ID:
      {
        let selectionMetadata = await browser.tabs.sendMessage(tab.id, {
            type: 'getSelectionMetadata',
        }, {
          frameId: info.frameId,
        });

        let annotation = await prompt('Annotation');
        newAnnotationId = await annotationStore.addAnnotation(tab.url, {
          annotation,
          text: info.selectionText,
          metadata: selectionMetadata,
        });
      }
      break;
  }

  let annotations = await annotationStore.getAnnotations(tab.url);

  if(newAnnotationId && info.targetElementId) {
    let newAnnotation = annotations.find(a => a.id == newAnnotationId);
    if(newAnnotation) {
      newAnnotation.expectedElementId = info.targetElementId;
    }
  }

  browser.tabs.sendMessage(tab.id, {
      type: 'annotationUpdate',
      annotations: annotations,
  }, {
    frameId: info.frameId,
  });
});

addAsyncListener(browser.runtime.onMessage, async function(request, sender) {
  if(request.type == 'fetchAnnotations') {
    return {
        annotations: await annotationStore.getAnnotations(request.url),
    };
  } else if(request.type == 'ready') {
    browser.tabs.sendMessage(sender.tab.id, {
        type: 'annotationUpdate',
        annotations: await annotationStore.getAnnotations(sender.url),
    }, {
      frameId: sender.frameId,
    });

    return {
      ok: true,
    };
  } else if(request.type == 'showNotification') {
    let { annotation, message } = request;
    let title = 'Annotation Match Issue';

    browser.notifications.create({
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/48.png'),
      title: title,
      message: message,
    });
  }
});
