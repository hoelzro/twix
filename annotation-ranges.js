export function getAnnotationRanges(nodes, annotations) {
  let fullText = nodes.map(node => node.textContent).join('');
  let indexMappings = [];
  let preStartIndex = 0;
  let postStartIndex = 0;
  let fullTextCollapsed = '';

  // XXX this RE probably needs refinement
  for(let m of fullText.matchAll(/(?:[ \f\n\t\r]{2,})|[\f\n\t\r]+/gd)) {
    let preEndIndex = m.index + m[0].length;
    let postEndIndex = m.index - (preStartIndex - postStartIndex) + 1; // XXX I *think* this is correct, and that this is the best way?

    fullTextCollapsed += fullText.substring(preStartIndex, m.index) + ' ';

    indexMappings.push({
      preStartIndex,
      preEndIndex,
      postStartIndex,
      postEndIndex,
    });

    preStartIndex = preEndIndex;
    postStartIndex = postEndIndex;
  }

  // XXX is this right, or is there an off-by-one error here?
  if(preStartIndex < fullText.length - 1) {
    indexMappings.push({
      preStartIndex,
      postStartIndex,

      preEndIndex: fullText.length,
      postEndIndex: postStartIndex + (fullText.length - preStartIndex),
    });

    fullTextCollapsed += fullText.substring(preStartIndex);
  }

  let nodePositions = nodes.reduce((accum, node) => accum.concat([{node, start: accum[accum.length - 1].end, end: accum[accum.length - 1].end + node.textContent.length}]), [{start: 0, end: 0}]).slice(1);

  let ranges = [];

  for(let {text} of annotations) {
    // XXX all positions, please
    let startIndex = fullTextCollapsed.indexOf(text);

    // XXX ah shit
    if(startIndex == -1) {
      console.log('unable to find text: ', text);
      continue;
    }

    let endIndex = startIndex + text.length;

    let startMapping = indexMappings.find(({postStartIndex, postEndIndex}) => postStartIndex <= startIndex && startIndex < postEndIndex);
    let endMapping = indexMappings.find(({postStartIndex, postEndIndex}) => postStartIndex <= endIndex && endIndex <= postEndIndex);

    // XXX try to come up with a better name for a new variable for this?
    startIndex = startMapping.preStartIndex + (startIndex - startMapping.postStartIndex);
    endIndex = endMapping.preStartIndex + (endIndex - endMapping.postStartIndex);

    let startPosition = nodePositions.find(({start, end}) => startIndex >= start && startIndex < end);
    let endPosition = nodePositions.findLast(({start, end}) => endIndex > start && endIndex <= end)

    let startOffset = startIndex - startPosition.start;
    let endOffset = endIndex - endPosition.start;

    let range = document.createRange();
    range.setStart(startPosition.node, startOffset);
    range.setEnd(endPosition.node, endOffset);

    ranges.push(range);
    // XXX there's this kind of "double mapping" there going on, which I find kinda convoluted and confusing
  }

  return ranges;
}
