import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const selectionMetadataCode = readFileSync(join(__dirname, '..', 'selection-metadata.js'), 'utf-8');

async function setupPage(page, htmlFile) {
  const fixturePath = join(__dirname, 'fixtures', htmlFile);
  await page.goto(`file://${fixturePath}`);

  await page.evaluate(code => {
    const scriptContent = code.replace('export function getSelectionMetadata', 'window.getSelectionMetadata = function');
    eval(scriptContent);
  }, selectionMetadataCode);
}

async function getMetadata(page) {
  return await page.evaluate(() => {
    const { getSelectionMetadata } = window;
    return getSelectionMetadata(document);
  });
}

async function selectText(page, {
  startSelector,
  startNodeIndex = 0,
  startOffset,
  endSelector = startSelector,
  endNodeIndex = startNodeIndex,
  endOffset,
}) {
  await page.evaluate(opts => {
    const startElement = document.querySelector(opts.startSelector);
    const endElement = document.querySelector(opts.endSelector);

    const startWalker = document.createTreeWalker(startElement, NodeFilter.SHOW_TEXT);
    const endWalker = document.createTreeWalker(endElement, NodeFilter.SHOW_TEXT);

    const startNodes = [];
    let node;
    while(node = startWalker.nextNode()) {
      startNodes.push(node);
    }

    const endNodes = [];
    while(node = endWalker.nextNode()) {
      endNodes.push(node);
    }

    const startNode = startNodes[opts.startNodeIndex];
    const endNode = endNodes[opts.endNodeIndex];

    const range = document.createRange();
    range.setStart(startNode, opts.startOffset);
    range.setEnd(endNode, opts.endOffset);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, { startSelector, startNodeIndex, startOffset, endSelector, endNodeIndex, endOffset });
}

test.describe('getSelectionMetadata - Single Node Selections', () => {
  test('should extract metadata for full text selection', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#simple', startOffset: 0, endOffset: 55 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 0,
        endOffset: 55,
        nodes: [{
          textContent: 'This is a simple paragraph with plain text for testing.',
        }],
      }],
    });
  });

  test('should extract metadata for partial text selection', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#partial', startOffset: 4, endOffset: 19 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 4,
        endOffset: 19,
        nodes: [{
          textContent: 'The quick brown fox jumps over the lazy dog.',
        }],
      }],
    });
  });

  test('should handle selection at start of text', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#partial', startOffset: 0, endOffset: 9 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 0,
        endOffset: 9,
        nodes: [{
          textContent: 'The quick brown fox jumps over the lazy dog.',
        }],
      }],
    });
  });

  test('should handle selection at end of text', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#partial', startOffset: 40, endOffset: 44 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 40,
        endOffset: 44,
        nodes: [{
          textContent: 'The quick brown fox jumps over the lazy dog.',
        }],
      }],
    });
  });

  test('should handle single character selection', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#simple', startOffset: 5, endOffset: 6 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 5,
        endOffset: 6,
        nodes: [{
          textContent: 'This is a simple paragraph with plain text for testing.',
        }],
      }],
    });
  });

  test('should handle text with line breaks', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#multiline', startOffset: 0, endOffset: 20 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 0,
        endOffset: 20,
        nodes: [{
          textContent: expect.stringContaining('\n'),
        }],
      }],
    });
  });
});

test.describe('getSelectionMetadata - Multi-Node Selections', () => {
  test('should handle selection across emphasis element', async ({ page }) => {
    await setupPage(page, 'formatted-text.html');
    await selectText(page, {
      startSelector: '#emphasis',
      startNodeIndex: 0,
      startOffset: 10,
      endNodeIndex: 2,
      endOffset: 14,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 10,
        endOffset: 14,
        nodes: [
          { textContent: 'This text has ' },
          { textContent: 'emphasis' },
          { textContent: ' in the middle.' },
        ],
      }],
    });
  });

  test('should handle selection starting in plain text and ending in formatted text', async ({ page }) => {
    await setupPage(page, 'formatted-text.html');
    await selectText(page, {
      startSelector: '#strong',
      startNodeIndex: 0,
      startOffset: 5,
      endNodeIndex: 1,
      endOffset: 6,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 5,
        endOffset: 6,
        nodes: [
          { textContent: 'This text has ' },
          { textContent: 'strong formatting' },
        ],
      }],
    });
  });

  test('should handle selection across multiple formatted elements', async ({ page }) => {
    await setupPage(page, 'formatted-text.html');
    await selectText(page, {
      startSelector: '#multiple',
      startNodeIndex: 0,
      startOffset: 6,
      endNodeIndex: 4,
      endOffset: 5,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 6,
        endOffset: 5,
        nodes: expect.arrayContaining([
          expect.objectContaining({ textContent: expect.any(String) }),
        ]),
      }],
    });
    expect(metadata.ranges[0].nodes.length).toBeGreaterThan(2);
  });

  test('should handle selection with code element', async ({ page }) => {
    await setupPage(page, 'formatted-text.html');
    await selectText(page, {
      startSelector: '#code',
      startNodeIndex: 0,
      startOffset: 15,
      endNodeIndex: 2,
      endOffset: 11,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 15,
        endOffset: 11,
        nodes: [
          expect.objectContaining({ textContent: expect.any(String) }),
          { textContent: 'variable shadowing' },
          expect.objectContaining({ textContent: expect.any(String) }),
        ],
      }],
    });
  });

  test('should handle selection across nested formatted elements', async ({ page }) => {
    await setupPage(page, 'formatted-text.html');
    await selectText(page, {
      startSelector: '#nested',
      startNodeIndex: 0,
      startOffset: 5,
      endNodeIndex: 2,
      endOffset: 3,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 5,
        endOffset: 3,
        nodes: expect.arrayContaining([
          expect.objectContaining({ textContent: expect.any(String) }),
        ]),
      }],
    });
    expect(metadata.ranges[0].nodes.length).toBeGreaterThanOrEqual(2);
  });
});

test.describe('getSelectionMetadata - Edge Cases', () => {
  test('should handle empty selection', async ({ page }) => {
    await setupPage(page, 'simple-text.html');

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [],
    });
  });

  test('should handle collapsed selection (cursor position)', async ({ page }) => {
    await setupPage(page, 'simple-text.html');
    await selectText(page, { startSelector: '#simple', startOffset: 10, endOffset: 10 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 10,
        endOffset: 10,
        nodes: [{
          textContent: 'This is a simple paragraph with plain text for testing.',
        }],
      }],
    });
  });

  test('should handle selection across multiple paragraphs', async ({ page }) => {
    await setupPage(page, 'complex-structure.html');
    await selectText(page, {
      startSelector: '#para1',
      startOffset: 6,
      endSelector: '#para2',
      endOffset: 6,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 6,
        endOffset: 6,
        nodes: expect.arrayContaining([
          expect.objectContaining({ textContent: expect.any(String) }),
        ]),
      }],
    });
    expect(metadata.ranges[0].nodes.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle selection in list items', async ({ page }) => {
    await setupPage(page, 'complex-structure.html');
    await selectText(page, { startSelector: '#item1', startOffset: 0, endOffset: 10 });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 0,
        endOffset: 10,
        nodes: [{
          textContent: 'First list item',
        }],
      }],
    });
  });

  test('should handle selection across list items', async ({ page }) => {
    await setupPage(page, 'complex-structure.html');
    await selectText(page, {
      startSelector: '#item1',
      startOffset: 6,
      endSelector: '#item2',
      endOffset: 6,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 6,
        endOffset: 6,
        nodes: expect.arrayContaining([
          { textContent: 'First list item' },
          { textContent: 'Second list item' },
        ]),
      }],
    });
    expect(metadata.ranges[0].nodes.length).toBeGreaterThanOrEqual(2);
  });

  test('should handle selection with only whitespace', async ({ page }) => {
    await setupPage(page, 'simple-text.html');

    await page.evaluate(() => {
      const body = document.querySelector('body');
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);

      let textNode;
      while(textNode = walker.nextNode()) {
        if(textNode.textContent.includes('\n')) {
          const range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 1);

          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }
      }
    });

    const metadata = await getMetadata(page);

    if(metadata.ranges.length > 0) {
      expect(metadata).toEqual({
        ranges: [{
          startOffset: expect.any(Number),
          endOffset: expect.any(Number),
          nodes: [{
            textContent: expect.any(String),
          }],
        }],
      });
    } else {
      expect(metadata).toEqual({ ranges: [] });
    }
  });

  test('should handle zero-length text node in selection', async ({ page }) => {
    await setupPage(page, 'simple-text.html');

    await page.evaluate(() => {
      const para = document.querySelector('#simple');
      para.innerHTML = 'Text<span></span> more text';
    });

    await selectText(page, {
      startSelector: '#simple',
      startNodeIndex: 0,
      startOffset: 0,
      endNodeIndex: 1,
      endOffset: 9,
    });

    const metadata = await getMetadata(page);

    expect(metadata).toEqual({
      ranges: [{
        startOffset: 0,
        endOffset: 9,
        nodes: expect.arrayContaining([
          expect.objectContaining({ textContent: expect.any(String) }),
        ]),
      }],
    });
    expect(metadata.ranges[0].nodes.length).toBeGreaterThanOrEqual(1);
  });
});
