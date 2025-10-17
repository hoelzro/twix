// imported below
let getAnnotationRanges;

function awaitBackgroundReady() {
  try {
    browser.runtime.sendMessage({
      type: 'ready',
    }).then(function(res) {
      if(!res) {
        setTimeout(awaitBackgroundReady, 1_000);
      }
    }, function(e) {
      setTimeout(awaitBackgroundReady, 1_000);
    });
  } catch(e) {
    setTimeout(awaitBackgroundReady, 1_000);
  }
}

browser.runtime.onMessage.addListener(function(msg) {
  if(msg.type == 'annotationUpdate') {
    let { annotations, followUpURLs } = msg;

    let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let nodes = [];
    let node;
    while(node = walker.nextNode()) {
      nodes.push(node);
    }

    let rangeMap = getAnnotationRanges(nodes, annotations);
    let allRanges = Array.from(rangeMap.values()).flat();

    for(let [annotation, ranges] of rangeMap.entries()) {
      if(ranges.length !== 1) {
        let message = (ranges.length == 0
          ? `No matches found for annotation: "${annotation.text || annotation.selection}"`
          :`${ranges.length} matches found for annotation: "${annotation.text || annotation.selection}"`);

        browser.runtime.sendMessage({
          type: 'showNotification',
          message: message,
        });
      }

      if(annotation.expectedElementId) {
        let targetElement = browser.menus.getTargetElement(annotation.expectedElementId);
        if(targetElement) {
          let verificationPassed = ranges.some(range => range.intersectsNode(targetElement));
          if(!verificationPassed) {
            browser.runtime.sendMessage({
              type: 'showNotification',

              message: `Round-trip verification failed for annotation: "${annotation.text}". The highlighted text may not match your original selection.`,
            });
          }
        }
      }
    }

    CSS.highlights.set('annotation-highlight', new Highlight(...allRanges));

    followUpURLs = new Set(followUpURLs);
    let followUpLinks = Array.from(document.querySelectorAll('a')).filter(a => followUpURLs.has(a.href));
    let followUpRanges = [];
    for(let link of followUpLinks) {
      let range = document.createRange();
      range.setStart(link, 0);
      range.setEnd(link, 1); // XXX this *happens* to work, but will it continue to?
      followUpRanges.push(range);
    }
    CSS.highlights.set('follow-up-link', new Highlight(...followUpRanges));
  } else if(msg.type == 'getSelectionMetadata') {
    let sel = document.getSelection();

    let ranges = [];

    for(let i = 0; i < sel.rangeCount; i++) {
      let r = sel.getRangeAt(i);
      let closestAncestor = r.startContainer;
      while(closestAncestor != null) {
        if(closestAncestor.contains(r.endContainer)) {
          break;
        }
        closestAncestor = closestAncestor.parentNode;
      }
      let w = document.createTreeWalker(closestAncestor, NodeFilter.SHOW_TEXT);
      while(w.currentNode != r.startContainer) {
        if(!w.nextNode()) {
          // XXX handle this differently
          break;
        }
      }
      let nodes = [w.currentNode];
      let node;
      while(node = w.nextNode()) {
        nodes.push(node);
        if(node == r.endContainer) {
          break;
        }
      }

      ranges.push({
        startOffset: r.startOffset,
        endOffset: r.endOffset,
        nodes: nodes.map(({textContent}) => ({textContent})),
      });
    }

    return Promise.resolve({
      ranges,
    });
  }
});

import(browser.runtime.getURL('annotation-ranges.js')).then(function(res) {
  getAnnotationRanges = res.getAnnotationRanges;
  awaitBackgroundReady();
});
