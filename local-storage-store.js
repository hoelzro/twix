export let annotationStore = {
  async getAnnotations(targetURL) {
    let results = await browser.storage.local.get();

    return Object.entries(results).filter(([id, {url}]) => url == targetURL).map(([id, {selection}]) => ({id, text: selection}));
  },

  async addAnnotation(url, attrs) {
    let ts = (new Date()).getTime().toString();
    await browser.storage.local.set({
      [ts]: { url: url, ...attrs },
    });
    return ts;
  },

  async addFollowUp(url, attrs) {
    console.log('got follow-up from user', { url, ...attrs });
  },
};
