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
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
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
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[1]); // 'world' node
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[2]); // ' test' node
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Annotation spanning collapsed whitespace', () => {
  const nodes = [new MockTextNode('hello  world test')];
  const annotations = [{ text: 'hello world' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[0]);
  assert.strictEqual(ranges[0].endOffset, 12); // Should span to end of 'world' in original text
});

test('Annotation after collapsed whitespace', () => {
  const nodes = [new MockTextNode('hello  world test')];
  const annotations = [{ text: 'world' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
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
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 3);
  
  // First annotation: 'hello'
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
  
  // Second annotation: 'world'
  assert.strictEqual(ranges[1].startOffset, 7);
  assert.strictEqual(ranges[1].endOffset, 12);
  
  // Third annotation: 'more'
  assert.strictEqual(ranges[2].startOffset, 18);
  assert.strictEqual(ranges[2].endOffset, 22);
});

test('Annotation spanning multiple nodes with whitespace collapse', () => {
  const nodes = [
    new MockTextNode('hello  '),
    new MockTextNode('world\ttest')
  ];
  const annotations = [{ text: 'hello world' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 1);
  
  assert.strictEqual(ranges[0].startContainer, nodes[0]); // Start in first node
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endContainer, nodes[1]); // End in second node
  assert.strictEqual(ranges[0].endOffset, 5); // End of 'world'
});

test('Annotation not found', () => {
  const nodes = [new MockTextNode('hello world')];
  const annotations = [{ text: 'nonexistent' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 0);
});

test('Annotation at very beginning', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{ text: 'hello' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Annotation at very end', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{ text: 'world' }];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
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
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 2);
  
  // Both ranges should be created successfully
  assert.ok(ranges[0].startContainer !== null);
  assert.ok(ranges[1].startContainer !== null);
});

test('Overlapping text with different whitespace', () => {
  const nodes = [new MockTextNode('hello    world    test')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];
  
  const ranges = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(ranges.length, 2);
  // Both should find their text in the collapsed version
  assert.ok(ranges[0].startOffset >= 0);
  assert.ok(ranges[1].startOffset >= 0);
});

test('Overlapping text with different whitespace 2', () => {
  const nodes = [new MockTextNode('hello\n   world    test')];
  const annotations = [
    { text: 'hello world' },
    { text: 'world test' }
  ];

  const ranges = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(ranges.length, 2);
  // Both should find their text in the collapsed version
  assert.ok(ranges[0].startOffset >= 0);
  assert.ok(ranges[1].startOffset >= 0);
});
