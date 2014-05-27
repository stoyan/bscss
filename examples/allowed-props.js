var bs = require('../lib/bs.js');
var css =
  'a { \n\
    color: red;\n\
    animation: cool; \n\
    -webkit-animation: notcool;\n\
    transition: mind-bending;\n\
    filter: none;\n\
    -ms-filter: none;\n\
    text-shadow: none;\n\
  }';

['chrome', 'opera', 'ie7', 'ie11'].forEach(function(browser) {
  console.log(browser + ':');
  console.log(bs.transform(css, browser));
})

