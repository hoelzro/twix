export let annotationStore = {
  async getAnnotations(targetURL) {
    let results = await browser.storage.local.get();

    return Object.values(results).filter(({url}) => url == targetURL).map(({selection}) => ({text: selection}));
  },

  async addAnnotation(url, attrs) {
    let ts = (new Date()).getTime();
    await browser.storage.local.set({
      [ts]: { url: url, ...attrs },
    });
  },

  async addFollowUp(url, attrs) {
    console.log('got follow-up from user', { url, ...attrs });
  },
};
