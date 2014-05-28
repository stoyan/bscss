// parser
var gonzo = require('gonzales-ast');
// properties
var cssprops = require('cssprops');
// visitors
var prefix = require('./visitors/prefix.js');
var iehacks = require('./visitors/iehacks.js');
var props = require('./visitors/props.js');
var empty_delimeters = require('./visitors/empty-delimiters.js');
var media_queries = require('./visitors/media-queries.js');

function traverseAST(ast, browser) {
  var conf = browsers[browser];
  if (conf.prefix) {
    prefix.setAllowedPrefix(conf.prefix);
  } else {
    prefix.setNoPrefix();
  }

  iehacks.setAllowedHacks(conf.hacks ? conf.hacks : []);

  props.setProperties(cssprops[browser]);

  var visitors = [
    prefix,
    iehacks,
    props,
    empty_delimeters];
    
  if (conf.nomq) {
    visitors.push(media_queries);
  }

  return gonzo.traverse(ast, visitors);
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
    hacks: ['_'],
    nomq: true
  },
  ie7: {
    hacks: ['*', '_'],
    nomq: true
  },
  ie8: {
    prefix: 'ms',
    nomq: true
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
