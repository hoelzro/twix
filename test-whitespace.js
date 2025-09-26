#!/usr/bin/env node

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getAnnotationRanges } from './annotation-ranges.js';

// Mock DOM objects for Node.js testing
class MockRange {
  constructor() {
    this.startContainer = null;
    this.startOffset = 0;
    this.endContainer = null;
    this.endOffset = 0;
  }
  
  setStart(node, offset) {
    this.startContainer = node;
    this.startOffset = offset;
  }
  
  setEnd(node, offset) {
    this.endContainer = node;
    this.endOffset = offset;
  }
  
  toString() {
    return `Range(${this.startContainer?.textContent?.substring(this.startOffset, this.startOffset + 5) || 'null'}... @ ${this.startOffset} -> ${this.endContainer?.textContent?.substring(this.endOffset - 5, this.endOffset) || 'null'}... @ ${this.endOffset})`;
  }
}

class MockTextNode {
  constructor(textContent) {
    this.textContent = textContent;
    this.nodeType = 3; // TEXT_NODE
  }
}

// Mock document for createRange
global.document = {
  createRange: () => new MockRange()
};

test('Single node annotation without whitespace collapse', () => {
  const nodes = [new MockTextNode('hello world test')];
  const annotations = [{ text: 'world' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 6);
  assert.strictEqual(ranges[0].endContainer, nodes[0]);
  assert.strictEqual(ranges[0].endOffset, 11);
});

test('Multi-node annotation without whitespace collapse', () => {
  const nodes = [
    new MockTextNode('hello '),
    new MockTextNode('world'),
    new MockTextNode(' test')
  ];
  const annotations = [{ text: 'world test' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[1]); // 'world' node
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[2]); // ' test' node
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Annotation spanning collapsed whitespace', () => {
  const nodes = [new MockTextNode('hello  world test')];
  const annotations = [{ text: 'hello world' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[0]);
  assert.strictEqual(ranges[0].endOffset, 12); // Should span to end of 'world' in original text
});

test('Annotation after collapsed whitespace', () => {
  const nodes = [new MockTextNode('hello  world test')];
  const annotations = [{ text: 'world' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 7); // After the double space
  assert.strictEqual(ranges[0].endContainer, nodes[0]);
  assert.strictEqual(ranges[0].endOffset, 12);
});

test('Multiple annotations with whitespace collapse', () => {
  const nodes = [new MockTextNode('hello  world\tand  more')];
  const annotations = [
    { text: 'hello' },
    { text: 'world' },
    { text: 'more' }
  ];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 3);

  // First annotation: 'hello'
  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 5);
  }

  // Second annotation: 'world'
  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 7);
    assert.strictEqual(ranges[0].endOffset, 12);
  }

  // Third annotation: 'more'
  {
    const ranges = rangeMap.get(annotations[2]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 18);
    assert.strictEqual(ranges[0].endOffset, 22);
  }
});

test('Annotation spanning multiple nodes with whitespace collapse', () => {
  const nodes = [
    new MockTextNode('hello  '),
    new MockTextNode('world\ttest')
  ];
  const annotations = [{ text: 'hello world' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  
  assert.strictEqual(ranges[0].startContainer, nodes[0]); // Start in first node
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[1]); // End in second node
  assert.strictEqual(ranges[0].endOffset, 5); // End of 'world'
});

test('Annotation not found', () => {
  const nodes = [new MockTextNode('hello world')];
  const annotations = [{ text: 'nonexistent' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 0);
});

test('Annotation at very beginning', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{ text: 'hello' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Annotation at very end', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{ text: 'world' }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 7);
  assert.strictEqual(ranges[0].endOffset, 12);
});

test('Complex multi-node scenario with various whitespace', () => {
  const nodes = [
    new MockTextNode('The  quick\t'),
    new MockTextNode('brown\n\nfox  '),
    new MockTextNode('jumps')
  ];
  const annotations = [
    { text: 'quick brown' },
    { text: 'fox jumps' }
  ];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 2);
  
  // Both ranges should be created successfully
  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.ok(ranges[0].startContainer !== null);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.ok(ranges[0].startContainer !== null);
  }
});

test('Overlapping text with different whitespace', () => {
  const nodes = [new MockTextNode('hello    world    test')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);
  // Both should find their text in the collapsed version
  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 14);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 9);
    assert.strictEqual(ranges[0].endOffset, 22);
  }
});

test('Overlapping text with different whitespace 2', () => {
  const nodes = [new MockTextNode('hello\n   world    test')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);
  // Both should find their text in the collapsed version
  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 14);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 9);
    assert.strictEqual(ranges[0].endOffset, 22);
  }
});

test('Consecutive special whitespace characters', () => {
  const nodes = [new MockTextNode('hello\n\n\nworld\t\n\ttest')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 13);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 8);
    assert.strictEqual(ranges[0].endOffset, 20);
  }
});

test('Mixed whitespace starting with spaces', () => {
  const nodes = [new MockTextNode('hello   \nworld    \ttest')];
  const annotations = [{ text: 'hello world test' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, nodes[0].textContent.length);
});

test('Form feed and carriage return characters', () => {
  const nodes = [new MockTextNode('hello\fworld\rtest')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 11);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 6);
    assert.strictEqual(ranges[0].endOffset, 16);
  }
});

test('Exactly two whitespace characters boundary', () => {
  const nodes = [new MockTextNode('hello  world\n\ntest')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 12);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 7);
    assert.strictEqual(ranges[0].endOffset, 18);
  }
});

test('Text starting and ending with collapsible whitespace', () => {
  const nodes = [new MockTextNode('  \nhello  world  \t')];
  const annotations = [{ text: 'hello world' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.ok(ranges[0].startOffset >= 0);
});

test('Very long whitespace sequences', () => {
  const nodes = [new MockTextNode('hello          world\n\n\n\n\n\n\n\n\n\ntest')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 20);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 15);
    assert.strictEqual(ranges[0].endOffset, 34);
  }
});

test('Non-breaking space should NOT be collapsed', () => {
  const nodes = [new MockTextNode('hello\u00A0\u00A0world\u00A0test')];
  const annotations = [
    { text: 'hello\u00A0\u00A0world' }, // Should match exactly with double nbsp
    { text: 'world\u00A0test' }      // Should match exactly with single nbsp
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 12);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 7);
    assert.strictEqual(ranges[0].endOffset, 17);
  }
});

test('Em space and en space should NOT be collapsed', () => {
  const nodes = [new MockTextNode('hello\u2003\u2003world\u2002test')]; // em space + en space
  const annotations = [
    { text: 'hello\u2003\u2003world' }, // Should match with double em space
    { text: 'world\u2002test' }        // Should match with en space
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 12);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 7);
    assert.strictEqual(ranges[0].endOffset, 17);
  }
});

test('Thin space and zero-width space should NOT be collapsed', () => {
  const nodes = [new MockTextNode('hello\u2009\u2009world\u200Btest')]; // thin space + zero-width space
  const annotations = [
    { text: 'hello\u2009\u2009world' }, // Should match with double thin space
    { text: 'world\u200Btest' }        // Should match with zero-width space
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  {
    const ranges = rangeMap.get(annotations[0]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 0);
    assert.strictEqual(ranges[0].endOffset, 12);
  }

  {
    const ranges = rangeMap.get(annotations[1]);
    assert.strictEqual(ranges.length, 1);
    assert.strictEqual(ranges[0].startOffset, 7);
    assert.strictEqual(ranges[0].endOffset, 17);
  }
});

test('Mixed HTML and non-HTML whitespace', () => {
  const nodes = [new MockTextNode('hello  \u00A0world\n\n\u2003test')]; // HTML spaces + nbsp + newlines + em space
  const annotations = [
    { text: 'hello \u00A0world \u2003test' } // Should collapse HTML whitespace but preserve Unicode whitespace exactly
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.ok(ranges[0].startOffset >= 0);
});

test('Non-HTML whitespace should NOT trigger collapsing when alone', () => {
  const nodes = [new MockTextNode('hello\u00A0world\u2003test')]; // Single nbsp and em space
  const annotations = [
    { text: 'hello\u00A0world\u2003test' } // Should match exactly - no collapsing
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, nodes[0].textContent.length);
});

test('Multiple occurrences of same annotation in single node', () => {
  const nodes = [new MockTextNode('hello world hello again')];
  const annotations = [{ text: 'hello' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 2);

  // First occurrence
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);

  // Second occurrence
  assert.strictEqual(ranges[1].startContainer, nodes[0]);
  assert.strictEqual(ranges[1].startOffset, 12);
  assert.strictEqual(ranges[1].endOffset, 17);
});

test('Multiple occurrences across different nodes', () => {
  const nodes = [
    new MockTextNode('hello world '),
    new MockTextNode('hello again'),
  ];
  const annotations = [{ text: 'hello' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 2);

  // First occurrence in first node
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);

  // Second occurrence in second node
  assert.strictEqual(ranges[1].startContainer, nodes[1]);
  assert.strictEqual(ranges[1].startOffset, 0);
  assert.strictEqual(ranges[1].endOffset, 5);
});

test('Multiple occurrences with whitespace collapsing', () => {
  const nodes = [new MockTextNode('hello  world  hello  again')];
  const annotations = [{ text: 'hello' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 2);

  // First occurrence
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);

  // Second occurrence (after collapsed whitespace)
  assert.strictEqual(ranges[1].startContainer, nodes[0]);
  assert.strictEqual(ranges[1].startOffset, 14);
  assert.strictEqual(ranges[1].endOffset, 19);
});

test('Three occurrences of same annotation', () => {
  const nodes = [new MockTextNode('test one test two test three')];
  const annotations = [{ text: 'test' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 3);

  // First occurrence
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 4);

  // Second occurrence
  assert.strictEqual(ranges[1].startOffset, 9);
  assert.strictEqual(ranges[1].endOffset, 13);

  // Third occurrence
  assert.strictEqual(ranges[2].startOffset, 18);
  assert.strictEqual(ranges[2].endOffset, 22);
});

test('Overlapping text with multiple occurrences', () => {
  const nodes = [new MockTextNode('abcabc test abcabc')];
  const annotations = [{ text: 'abc' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 4);

  // Four occurrences of 'abc'
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 3);

  assert.strictEqual(ranges[1].startOffset, 3);
  assert.strictEqual(ranges[1].endOffset, 6);

  assert.strictEqual(ranges[2].startOffset, 12);
  assert.strictEqual(ranges[2].endOffset, 15);

  assert.strictEqual(ranges[3].startOffset, 15);
  assert.strictEqual(ranges[3].endOffset, 18);
});

test('Multiple annotations with multiple occurrences each', () => {
  const nodes = [new MockTextNode('cat dog cat mouse dog cat')];
  const annotations = [
    { text: 'cat' },
    { text: 'dog' },
  ];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  // Cat annotations
  const catRanges = rangeMap.get(annotations[0]);
  assert.strictEqual(catRanges.length, 3);
  assert.strictEqual(catRanges[0].startOffset, 0);
  assert.strictEqual(catRanges[0].endOffset, 3);
  assert.strictEqual(catRanges[1].startOffset, 8);
  assert.strictEqual(catRanges[1].endOffset, 11);
  assert.strictEqual(catRanges[2].startOffset, 22);
  assert.strictEqual(catRanges[2].endOffset, 25);

  // Dog annotations
  const dogRanges = rangeMap.get(annotations[1]);
  assert.strictEqual(dogRanges.length, 2);
  assert.strictEqual(dogRanges[0].startOffset, 4);
  assert.strictEqual(dogRanges[0].endOffset, 7);
  assert.strictEqual(dogRanges[1].startOffset, 18);
  assert.strictEqual(dogRanges[1].endOffset, 21);
});

test('No occurrences should return empty ranges array', () => {
  const nodes = [new MockTextNode('hello world')];
  const annotations = [{ text: 'nonexistent' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 0);
});

test('Multiple occurrences across nodes with whitespace collapse', () => {
  const nodes = [
    new MockTextNode('test  one\n'),
    new MockTextNode('test\ttwo  '),
    new MockTextNode('test three')
  ];
  const annotations = [{ text: 'test' }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 3);

  // Should find all three occurrences despite whitespace collapsing
  assert.strictEqual(ranges.length, 3);

  assert.ok(ranges[0].startContainer !== null);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 4);

  assert.ok(ranges[1].startContainer !== null);
  assert.strictEqual(ranges[1].startOffset, 0);
  assert.strictEqual(ranges[1].endOffset, 4);

  assert.ok(ranges[2].startContainer !== null);
  assert.strictEqual(ranges[2].startOffset, 0);
  assert.strictEqual(ranges[2].endOffset, 4);
});
