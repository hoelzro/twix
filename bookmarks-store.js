const ROOT_FOLDER_NAME = "Twix Annotations";
const URL_BOOKMARK_TITLE = "URL";
const ANNOTATION_PREFIX = "Annotation-";
const FOLLOWUP_PREFIX = "FollowUp-";

// Hash a URL to create a deterministic folder name using FNV-1a
function hashURL(url) {
  const FNV_OFFSET_BASIS = 2166136261;
  const FNV_PRIME = 16777619;

  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }

  // Convert to unsigned 32-bit and then to hex
  const unsigned = hash >>> 0;
  return 'page-' + unsigned.toString(16).padStart(8, '0');
}

// Find or create the root "Twix Annotations" folder
async function ensureRootFolder() {
  // Search for existing root folder
  const results = await browser.bookmarks.search({ title: ROOT_FOLDER_NAME });
  const rootFolder = results.find(r => r.type === 'folder' && r.title === ROOT_FOLDER_NAME);

  if (rootFolder) {
    return rootFolder.id;
  }

  // Create root folder under bookmarks root
  const created = await browser.bookmarks.create({
    title: ROOT_FOLDER_NAME,
    type: 'folder'
  });

  return created.id;
}

// Find a page folder by URL hash
async function findPageFolder(url) {
  const hash = hashURL(url);
  const rootId = await ensureRootFolder();

  const children = await browser.bookmarks.getChildren(rootId);
  const pageFolder = children.find(c => c.type === 'folder' && c.title === hash);

  return pageFolder ? pageFolder.id : null;
}

// Get or create a page folder, ensuring it has a URL bookmark
async function getOrCreatePageFolder(url) {
  let folderId = await findPageFolder(url);

  if (folderId) {
    return folderId;
  }

  // Create new page folder
  const hash = hashURL(url);
  const rootId = await ensureRootFolder();

  let folder;
  try {
    folder = await browser.bookmarks.create({
      parentId: rootId,
      title: hash,
      type: 'folder'
    });

    // Create URL bookmark inside the folder
    await browser.bookmarks.create({
      parentId: folder.id,
      title: URL_BOOKMARK_TITLE,
      url: url
    });

    return folder.id;
  } catch (e) {
    // Clean up orphaned folder if URL bookmark creation failed
    if (folder) {
      await browser.bookmarks.remove(folder.id).catch(() => {});
    }
    throw e;
  }
}

// Encode data object as a bookmark URL
function encodeData(obj) {
  const json = JSON.stringify(obj);
  const encoded = encodeURIComponent(json);
  return 'data:application/json,' + encoded;
}

// Decode data from a bookmark URL
function decodeData(bookmarkUrl) {
  if (!bookmarkUrl || !bookmarkUrl.startsWith('data:application/json,')) {
    return null;
  }
  const encoded = bookmarkUrl.substring('data:application/json,'.length);
  const json = decodeURIComponent(encoded);
  return JSON.parse(json);
}

// Get all bookmarks matching a title prefix from a folder
async function getBookmarksByPrefix(folderId, prefix) {
  const children = await browser.bookmarks.getChildren(folderId);
  return children
    .filter(c => c.type === 'bookmark' && c.title.startsWith(prefix))
    .map(bookmark => {
      const id = bookmark.title.substring(prefix.length);
      const data = decodeData(bookmark.url);
      return { id, ...data };
    });
}

export let annotationStore = {
  async getAllAnnotations() {
    const rootId = await ensureRootFolder();
    const pageFolders = await browser.bookmarks.getChildren(rootId);

    const allAnnotations = [];
    for (const folder of pageFolders.filter(f => f.type === 'folder')) {
      const annotations = await getBookmarksByPrefix(folder.id, ANNOTATION_PREFIX);
      allAnnotations.push(...annotations);
    }

    return allAnnotations;
  },

  async getAllFollowUps() {
    const rootId = await ensureRootFolder();
    const pageFolders = await browser.bookmarks.getChildren(rootId);

    const allFollowUps = [];
    for (const folder of pageFolders.filter(f => f.type === 'folder')) {
      const followUps = await getBookmarksByPrefix(folder.id, FOLLOWUP_PREFIX);
      allFollowUps.push(...followUps);
    }

    return allFollowUps;
  },

  async getAnnotations(targetURL) {
    const folderId = await findPageFolder(targetURL);
    if (!folderId) {
      return [];
    }

    return await getBookmarksByPrefix(folderId, ANNOTATION_PREFIX);
  },

  async getFollowUps(targetURL) {
    const folderId = await findPageFolder(targetURL);
    if (!folderId) {
      return [];
    }

    return await getBookmarksByPrefix(folderId, FOLLOWUP_PREFIX);
  },

  async addAnnotation(url, attrs, id = null) {
    const folderId = await getOrCreatePageFolder(url);
    const ts = id || (new Date()).getTime().toString();

    await browser.bookmarks.create({
      parentId: folderId,
      title: ANNOTATION_PREFIX + ts,
      url: encodeData({ url: url, ...attrs })
    });

    return ts;
  },

  async addFollowUp(url, followUpURL, id = null) {
    const folderId = await getOrCreatePageFolder(url);
    const ts = id || (new Date()).getTime().toString();

    await browser.bookmarks.create({
      parentId: folderId,
      title: FOLLOWUP_PREFIX + ts,
      url: encodeData({ url: url, followUpURL: followUpURL })
    });

    return ts;
  },

  async clearAll() {
    // Search for existing root folder
    const results = await browser.bookmarks.search({ title: ROOT_FOLDER_NAME });
    const rootFolder = results.find(r => r.type === 'folder' && r.title === ROOT_FOLDER_NAME);

    if (rootFolder) {
      await browser.bookmarks.removeTree(rootFolder.id);
    }
  },
};
