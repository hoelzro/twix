import assert from 'node:assert';

export function getAnnotationRanges(nodes, annotations) {
  let rangeMap = new Map();

  for(let annotation of annotations) {
    let ranges = [];

    // XXX for now
    assert.equal(annotation.metadata.ranges.length, 1);

    let { startOffset, endOffset, nodes: annotationNodes } = annotation.metadata.ranges[0];

    // XXX you have to use startOffset for this
    //       do you, though? the node itself should probably match, even if the annotation doesn't cover the *entire* node?
    let startIndices = Object.entries(nodes).filter(([i, n]) => n.textContent == annotationNodes[0].textContent).map(([i, _]) => parseInt(i));

    // XXX test situations where the first node matches but then subsequent nodes may or may not
    for(let startIdx of startIndices) {
      // XXX you have to use startOffset for this
      // XXX you have to use endOffset for this
      //       do you, though? the node itself should probably match, even if the annotation doesn't cover the *entire* node?
      if(annotationNodes.every((n, offset) => startIdx + offset < nodes.length && nodes[startIdx + offset].textContent == n.textContent)) {
        let range = document.createRange();
        range.setStart(nodes[startIdx], startOffset);
        range.setEnd(nodes[startIdx + annotationNodes.length - 1], endOffset);

        ranges.push(range);
      }
    }

    rangeMap.set(annotation, ranges);
  }

  return rangeMap;
}
