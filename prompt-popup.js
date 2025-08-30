let params = new URLSearchParams(document.location.hash.substring(1));

document.getElementsByTagName('label')[0].innerText = params.get('message') + ':';
let value = params.get('value');
if(value != '') {
  document.getElementById('user-input').value = value;
}

document.getElementsByTagName('form')[0].addEventListener('submit', function(e) {
  e.preventDefault();

  browser.runtime.sendMessage({
    type: 'promptResult',
    value: document.getElementById('user-input').value,
  }).catch(function(e) {
    console.error('got error when sending message from prompt', e);
  }).finally(function() {
    window.close();
  });
});
