var gonzo = require('gonzales-ast');
var prefixes = require('./visitors/prefix.js');
var hacks = require('./visitors/iehacks.js');

function traverseAST(ast, browser) {
  var conf = browsers[browser];
  if (conf.prefix) {
    prefixes.setAllowedPrefix(conf.prefix);
  } else {
    prefixes.setNoPrefix();
  }

  hacks.setAllowedHacks(conf.hacks ? conf.hacks : []);

  return gonzo.traverse(ast, [prefixes, hacks]);
}

var browsers = {
  chrome: {
    prefix: 'webkit'
  },
  ios: {
    prefix: 'webkit'
  },
  safari: {
    prefix: 'webkit'
  },
  firefox: {
    prefix: 'webkit'
  },
  opera: {
    prefix: 'o'
  },  
  ie6: {
    hacks: ['_']
  },
  ie7: {
    hacks: ['*', '_']
  },
  ie8: {
    prefix: 'ms'
  },
  ie9: {
    prefix: 'ms'
  },
  ie10: {
    prefix: 'ms'
  },
  ie11: {
    prefix: 'ms'
  }
};

exports.transform = function transform(css, browser) {
  var ast = gonzo.parse(css);
  ast = traverseAST(ast, browser);
  return gonzo.toCSS(ast);
}

exports.transformAST = function transformAst(ast, browser) {
  return traverseAST(ast, browser);
}
