var bscss = require('../index.js');

getBrowswerOptions = function() {
  var opts = [];
  bscss.browsers.forEach(function(b) {
    opts.push(
      '<input type="radio" name="browser" value="%s" id="%s"><label for="%s">%s</label>'
      .replace(/%s/g, b));
  });
  return opts;
};

transform = function(css, browser) {
  return bscss.transform(css, browser);
};

whoami = function() {
  return bscss.stringGetStringIdStringFromUserAgentSring(navigator.userAgent);
}