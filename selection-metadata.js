export function getSelectionMetadata(document) {
  let sel = document.getSelection();

  let ranges = [];

  for(let i = 0; i < sel.rangeCount; i++) {
    let r = sel.getRangeAt(i);
    let w = document.createTreeWalker(r.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    while(w.currentNode != r.startContainer) {
      if(!w.nextNode()) {
        // XXX handle this differently
        break;
      }
    }

    if(w.currentNode.nodeType != Node.TEXT_NODE) {
      w.nextNode();
    }

    let nodes = [w.currentNode];
    let node;
    while(node = w.nextNode()) {
      nodes.push(node);
      if(node == r.endContainer) {
        break;
      }
    }

    let startOffset = r.startContainer.nodeType == Node.TEXT_NODE ? r.startOffset : 0;
    let endOffset   = r.endContainer.nodeType   == Node.TEXT_NODE ? r.endOffset : nodes[nodes.length - 1].textContent.length;

    ranges.push({
      startOffset,
      endOffset,
      nodes: nodes.map(({textContent}) => ({textContent})),
    });
  }

  return {
    ranges,
  };
}
