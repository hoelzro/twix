export function getSelectionMetadata(document) {
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

  return {
    ranges,
  };
}
