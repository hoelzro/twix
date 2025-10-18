export let annotationStore = {
  async getAllAnnotations() {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([_, {followUpURL}]) => !followUpURL).map(([id, annotation]) => ({id, ...annotation}));
  },

  async getAllFollowUps() {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([_, {followUpURL}]) => followUpURL).map(([id, followUp]) => ({id, ...followUp}));
  },

  async getAnnotations(targetURL) {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([id, {followUpURL, url}]) => !followUpURL && url == targetURL).map(([id, rest]) => ({id, ...rest}));
  },

  async getFollowUps(targetURL) {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([_, {followUpURL, url}]) => followUpURL && url == targetURL).map(([id, rest]) => ({id, ...rest}));
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
