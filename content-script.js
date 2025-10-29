// imported below
let getAnnotationRanges;
let getSelectionMetadata;

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
    let { annotations, followUps } = msg;

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
          : `${ranges.length} matches found for annotation: "${annotation.text || annotation.selection}"`);

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

    let followUpURLs = new Set(followUps.map(({followUpURL}) => followUpURL));
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
    return Promise.resolve(getSelectionMetadata(document));
  }
});

Promise.all([
  import(browser.runtime.getURL('annotation-ranges.js')),
  import(browser.runtime.getURL('selection-metadata.js')),
]).then(function([annotationRangesModule, selectionMetadataModule]) {
  getAnnotationRanges = annotationRangesModule.getAnnotationRanges;
  getSelectionMetadata = selectionMetadataModule.getSelectionMetadata;
  awaitBackgroundReady();
});
