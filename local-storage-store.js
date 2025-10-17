export let annotationStore = {
  async getAllAnnotations() {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([_, {followUpURL}]) => !followUpURL).map(([id, annotation]) => ({id, ...annotation}));
  },

  async getAnnotations(targetURL) {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([id, {followUpURL, url}]) => !followUpURL && url == targetURL).map(([id, rest]) => ({id, ...rest}));
  },

  async getFollowUpURLs(targetURL) {
    let results = await browser.storage.local.get();

    return Object.values(results).filter(({followUpURL, url}) => followUpURL && url == targetURL).map(({followUpURL}) => followUpURL);
  },

  async addAnnotation(url, attrs) {
    let ts = (new Date()).getTime().toString();
    await browser.storage.local.set({
      [ts]: { url: url, ...attrs },
    });
    return ts;
  },

  async addFollowUp(url, followUpURL) {
    let ts = (new Date()).getTime().toString();
    await browser.storage.local.set({
      [ts]: { url: url, followUpURL: followUpURL },
    });
    return ts;
  },
};
