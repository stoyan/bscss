var bs = require('../lib/bs.js');
var css = 'a{color: red; _color: blue; -o-stuff: cool; -ms-filter: 1}';


['chrome', 'opera', 'ie7', 'ie11'].forEach(function(browser) {
  console.log(browser + ':');
  console.log(bs.transform(css, browser));
})

