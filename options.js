import(browser.runtime.getURL('local-storage-store.js')).then(function({annotationStore}) {
  let exportButton = document.getElementById('export_button');
  let exportJsonButton = document.getElementById('export_json_button');
  let importJsonButton = document.getElementById('import_json_button');
  let importJsonInput = document.getElementById('import_json_input');

  exportButton.addEventListener('click', function() {

    let annotationsPromise = annotationStore.getAllAnnotations();
    let followUpsPromise = annotationStore.getAllFollowUps();

    Promise.all([annotationsPromise, followUpsPromise]).then(function([annotations, followUps]) {
      let dataByURL = Object.create(null);

      for(let annotation of annotations) {
        dataByURL[annotation.url] ??= {
          annotations: [],
          followUps: [],
        };
        dataByURL[annotation.url].annotations.push(annotation);
      }

      for(let followUp of followUps) {
        dataByURL[followUp.url] ??= {
          annotations: [],
          followUps: [],
        };
        dataByURL[followUp.url].followUps.push(followUp);
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

      for(let [url, {annotations, followUps}] of Object.entries(dataByURL)) {
        let highlights = [];

        for(let {annotation, text} of annotations) {
          // XXX could text contain things that would be interpreted as TW wikitext?
          highlights.push(`
<<<
${text}
<<<

${annotation ?? ''}
          `);
        }
        followUps = followUps.map(({followUpURL}) => '  - ' + followUpURL).join('\n');

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

  exportJsonButton.addEventListener('click', function() {
    let annotationsPromise = annotationStore.getAllAnnotations();
    let followUpsPromise = annotationStore.getAllFollowUps();

    Promise.all([annotationsPromise, followUpsPromise]).then(function([annotations, followUps]) {
      let data = {};

      annotations.forEach(annotation => {
        let {id, ...attrs} = annotation;
        data[id] = attrs;
      });

      followUps.forEach(followUp => {
        let {id, ...attrs} = followUp;
        data[id] = attrs;
      });

      let blobURL = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));

      browser.downloads.download({
        url: blobURL,
        filename: 'annotations-export.json',
      }).then(function(res) {
        console.log(res);
      }, function(e) {
        console.error('error downloading JSON export', e);
      });
    }, function(e) {
      console.error(e);
    });
  });

  importJsonButton.addEventListener('click', function() {
    importJsonInput.click();
  });

  importJsonInput.addEventListener('change', function() {
    let file = importJsonInput.files[0];
    if (!file) {
      return;
    }

    let reader = new FileReader();
    reader.onload = async function(e) {
      try {
        let data = JSON.parse(e.target.result);

        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          console.error('Invalid JSON format: expected object with ID keys');
          alert('Invalid JSON format. Expected an object with annotation IDs as keys.');
          return;
        }

        // Clear all existing data before importing
        await annotationStore.clearAll();

        // Import using the storage interface instead of direct browser.storage.local.set
        let importPromises = Object.entries(data).map(([id, attrs]) => {
          if (attrs.followUpURL) {
            return annotationStore.addFollowUp(attrs.url, attrs.followUpURL, id);
          } else {
            let {url, ...annotationAttrs} = attrs;
            return annotationStore.addAnnotation(url, annotationAttrs, id);
          }
        });

        Promise.all(importPromises).then(function() {
          alert('Annotations imported successfully!');
          importJsonInput.value = '';
        }, function(err) {
          console.error('Error importing annotations', err);
          alert('Error importing annotations. See console for details.');
        });
      } catch (err) {
        console.error('Error parsing JSON', err);
        alert('Error parsing JSON file. Please ensure it is valid JSON.');
      }
    };

    reader.readAsText(file);
  });
});

