// parser
var gonzo = require('gonzales-ast');
// properties
var cssprops = require('cssprops');
// visitors
var prefix = require('./visitors/prefix.js');
var iehacks = require('./visitors/iehacks.js');
var props = require('./visitors/props.js');

function traverseAST(ast, browser) {
  var conf = browsers[browser];
  if (conf.prefix) {
    prefix.setAllowedPrefix(conf.prefix);
  } else {
    prefix.setNoPrefix();
  }

  iehacks.setAllowedHacks(conf.hacks ? conf.hacks : []);

  props.setProperties(cssprops[browser]);

  return gonzo.traverse(ast, [prefix, iehacks, props]);
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
