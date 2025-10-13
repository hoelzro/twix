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
  const annotations = [{
    text: 'world',
    metadata: {
      ranges: [{
        startOffset: 6,
        endOffset: 11,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

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
  const annotations = [{
    text: 'world test',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(1, 3),
      }],
    },
  }];

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
  const annotations = [{
    text: 'hello world',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 12,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

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
  const annotations = [{
    text: 'world',
    metadata: {
      ranges: [{
        startOffset: 7,
        endOffset: 12,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

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
    {
      text: 'hello',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 5,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 12,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'more',
      metadata: {
        ranges: [{
          startOffset: 18,
          endOffset: 22,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
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
  const annotations = [{
    text: 'hello world',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(0, 2),
      }],
    },
  }];

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
  const annotations = [{
    text: 'nonexistent',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 11,
        nodes: [{ textContent: 'nonexistent' }],
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 0);
});

test('Annotation at very beginning', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{
    text: 'hello',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];
  
  const rangeMap = getAnnotationRanges(nodes, annotations);
  
  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Annotation at very end', () => {
  const nodes = [new MockTextNode('hello  world')];
  const annotations = [{
    text: 'world',
    metadata: {
      ranges: [{
        startOffset: 7,
        endOffset: 12,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];
  
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
    {
      text: 'quick brown',
      metadata: {
        ranges: [{
          startOffset: 5,
          endOffset: 5,
          nodes: nodes.slice(0, 2),
        }],
      },
    },
    {
      text: 'fox jumps',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 5,
          nodes: nodes.slice(1, 3),
        }],
      },
    },
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
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 14,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 9,
          endOffset: 22,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
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
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 14,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 9,
          endOffset: 22,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
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
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 13,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 8,
          endOffset: 20,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
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
  const annotations = [{
    text: 'hello world test',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 23,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

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
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 11,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 6,
          endOffset: 16,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 12,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 18,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
  const annotations = [{
    text: 'hello world',
    metadata: {
      ranges: [{
        startOffset: 3,
        endOffset: 15,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);
  assert.ok(ranges[0].startOffset >= 0);
});

test('Very long whitespace sequences', () => {
  const nodes = [new MockTextNode('hello          world\n\n\n\n\n\n\n\n\n\ntest')];
  const annotations = [
    {
      text: 'hello world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 20,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world test',
      metadata: {
        ranges: [{
          startOffset: 15,
          endOffset: 34,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello\u00A0\u00A0world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 12,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world\u00A0test',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 17,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello\u2003\u2003world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 12,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world\u2002test',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 17,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello\u2009\u2009world',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 12,
          nodes: nodes.slice(0, 1),
        }],
      },
    },
    {
      text: 'world\u200Btest',
      metadata: {
        ranges: [{
          startOffset: 7,
          endOffset: 17,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello \u00A0world \u2003test',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 20,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
    {
      text: 'hello\u00A0world\u2003test',
      metadata: {
        ranges: [{
          startOffset: 0,
          endOffset: 16,
          nodes: nodes.slice(0, 1),
        }],
      },
    }
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
  const annotations = [{
    text: 'hello',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence based on startOffset/endOffset
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Multiple occurrences across different nodes', () => {
  const nodes = [
    new MockTextNode('hello world '),
    new MockTextNode('hello again'),
  ];
  const annotations = [{
    text: 'hello',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence based on metadata
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Multiple occurrences with whitespace collapsing', () => {
  const nodes = [new MockTextNode('hello  world  hello  again')];
  const annotations = [{
    text: 'hello',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 5,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence based on startOffset/endOffset
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 5);
});

test('Three occurrences of same annotation', () => {
  const nodes = [new MockTextNode('test one test two test three')];
  const annotations = [{
    text: 'test',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 4,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence based on startOffset/endOffset
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 4);
});

test('Overlapping text with multiple occurrences', () => {
  const nodes = [new MockTextNode('abcabc test abcabc')];
  const annotations = [{
    text: 'abc',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 3,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence based on startOffset/endOffset
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 3);
});

test('Multiple annotations with multiple occurrences each', () => {
  const nodes = [new MockTextNode('cat dog cat mouse dog cat')];
  const annotations = [{
    text: 'cat',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 3,
        nodes: nodes.slice(0, 1),
      }],
    },
  }, {
    text: 'dog',
    metadata: {
      ranges: [{
        startOffset: 4,
        endOffset: 7,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 2);

  // Cat annotation - should only match first occurrence
  const catRanges = rangeMap.get(annotations[0]);
  assert.strictEqual(catRanges.length, 1);
  assert.strictEqual(catRanges[0].startOffset, 0);
  assert.strictEqual(catRanges[0].endOffset, 3);

  // Dog annotation - should only match first occurrence
  const dogRanges = rangeMap.get(annotations[1]);
  assert.strictEqual(dogRanges.length, 1);
  assert.strictEqual(dogRanges[0].startOffset, 4);
  assert.strictEqual(dogRanges[0].endOffset, 7);
});

test('No occurrences should return empty ranges array', () => {
  const nodes = [new MockTextNode('hello world')];
  const annotations = [{
    text: 'nonexistent',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 11,
        nodes: [{ textContent: 'nonexistent' }],
      }],
    },
  }];

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
  const annotations = [{
    text: 'test',
    metadata: {
      ranges: [{
        startOffset: 0,
        endOffset: 4,
        nodes: nodes.slice(0, 1),
      }],
    },
  }];

  const rangeMap = getAnnotationRanges(nodes, annotations);

  assert.strictEqual(rangeMap.size, 1);
  const ranges = rangeMap.get(annotations[0]);
  assert.strictEqual(ranges.length, 1);

  // Should only match the first occurrence in the first node
  assert.ok(ranges[0].startContainer !== null);
  assert.strictEqual(ranges[0].startContainer, nodes[0]);
  assert.strictEqual(ranges[0].startOffset, 0);
  assert.strictEqual(ranges[0].endOffset, 4);
});
