function gid(id) {
  return document.getElementById(id)
}

function parseSearch(s) {
  return s.split(/[?&]/)
    .filter(e => !!e)
    .reduce((o, e) => {
      let [prop, val] = e.split('=');
      o[prop] = decodeURIComponent(val);
      return o;
    }, {})
}

window.onload = function () {
  const params = parseSearch(location.search);

  if (params.error) {
    gid('error').innerText = 'Error: ' + params.error
  }

};
