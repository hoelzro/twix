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
    let { annotations } = msg;

    let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let nodes = [];
    let node;
    while(node = walker.nextNode()) {
      nodes.push(node);
    }

    let rangeMap = getAnnotationRanges(nodes, annotations);
    let allRanges = Array.from(rangeMap.values()).flat();

    CSS.highlights.set('annotation-highlight', new Highlight(...allRanges));
  }
});

import(browser.runtime.getURL('annotation-ranges.js')).then(function(res) {
  getAnnotationRanges = res.getAnnotationRanges;
  awaitBackgroundReady();
});
