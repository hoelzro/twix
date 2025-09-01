export let annotationStore = {
  async getAnnotations() {
    let results = await browser.storage.local.get();

    return Object.values(results).map(({selection}) => ({text: selection}));
  },

  async addAnnotation(attrs) {
    let ts = (new Date()).getTime();
    await browser.storage.local.set({
      [ts]: attrs,
    });
  },

  async addFollowUp(attrs) {
    console.log('got follow-up from user', attrs);
  },
};
