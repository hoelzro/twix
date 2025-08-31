export let annotationStore = {
  async addAnnotation(attrs) {
    console.log('got annotation from user', attrs);
  },

  async addFollowUp(attrs) {
    console.log('got follow-up from user', attrs);
  },
};
