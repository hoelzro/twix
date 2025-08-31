browser.runtime.sendMessage({
  type: 'fetchAnnotations',
}).then(function({annotations}) {
  let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let nodes = [];
  let node;
  while(node = walker.nextNode()) {
    nodes.push(node);
  }

  let fullText = nodes.map(node => node.textContent).join('');
  let nodePositions = nodes.reduce((accum, node) => accum.concat([{node, start: accum[accum.length - 1].end, end: accum[accum.length - 1].end + node.textContent.length}]), [{start: 0, end: 0}]).slice(1);

  let ranges = [];

  for(let {text} of annotations) {
    // XXX all positions, please
    let targetIndex = fullText.indexOf(text);

    let startPosition = nodePositions.find(({start, end}) => targetIndex >= start && targetIndex < end);
    let endPosition = nodePositions.findLast(({start, end}) => (targetIndex + text.length) >= start && (targetIndex + text.length) < end);

    let startOffset = targetIndex - startPosition.start;
    let endOffset = targetIndex + text.length - endPosition.start;

    let range = document.createRange();
    range.setStart(startPosition.node, startOffset);
    range.setEnd(endPosition.node, endOffset);

    ranges.push(range);
  }

  CSS.highlights.set('annotation-highlight', new Highlight(...ranges));
}, function(e) {
  console.error('got error from background script:', e);
});

