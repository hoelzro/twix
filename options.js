import(browser.runtime.getURL('local-storage-store.js')).then(function({annotationStore}) {
  let exportButton = document.getElementById('export_button');
  exportButton.addEventListener('click', function() {
    annotationStore.getAllAnnotations().then(function(annotations) {
      let annotationsByURL = Object.create(null);

      for(let annotation of annotations) {
        annotationsByURL[annotation.url] ??= [];
        annotationsByURL[annotation.url].push(annotation);
      }

      let tiddlers = [];

      let now = new Date();

      let datePieces = [
        {value: now.getUTCFullYear(), padding: 4},
        {value: now.getUTCMonth() + 1, padding: 2},
        {value: now.getUTCDate(), padding: 2},
        {value: now.getUTCHours(), padding: 2},
        {value: now.getUTCMinutes(), padding: 2},
        {value: now.getUTCSeconds(), padding: 2},
        {value: now.getUTCMilliseconds(), padding: 3},
      ];

      let creationDate = datePieces.map(({value, padding}) => value.toString().padStart(padding, '0')).join('');

      for(let [url, annotations] of Object.entries(annotationsByURL)) {
        let highlights = [];

        for(let {annotation, selection} of annotations) {
          // XXX could selection contain things that would be interpreted as TW wikitext?
          highlights.push(`
<<<
${selection}
<<<

${annotation ?? ''}
          `);
        }
        let followUps = ''; // XXX FIXME

        let tiddlerTitle = 'New Tiddler'; // XXX FIXME
        let tiddlerBody = `
${url}

! Highlights

${highlights.join('\n\n')}

! Follow-Ups

${followUps}
        `;
        tiddlers.push({
          title: tiddlerTitle,
          type: 'text/vnd.tiddlywiki',
          created: creationDate,
          modified: creationDate,
          // XXX tags?
          location: url,
          text: tiddlerBody,
        });
      }

      let blobURL = URL.createObjectURL(new Blob([JSON.stringify(tiddlers)], { type: 'application/json' }));

      browser.downloads.download({
        url: blobURL,
        filename: 'annotation-tiddlers.json',
      }).then(function(res) {
        console.log(res);
      }, function(e) {
      // XXX better way to signal error?
        console.error('error downloading exported tiddlers', e);
      });
      // XXX revoke the object URL after you're done?
    }, function(e) {
      // XXX better way to signal error?
      console.error(e);
    });
  });
});

