(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
};
},{"../index.js":2}],2:[function(require,module,exports){
module.exports = require('./lib/bs.js');


},{"./lib/bs.js":3}],3:[function(require,module,exports){
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
    prefix: 'moz'
  },
  opera: {
    prefix: 'webkit'
  },
  ie6: {
    hacks: ['_', '*'],
    nomq: true
  },
  ie7: {
    hacks: ['*'],
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
  },

};

exports.transform = function transform(css, browser) {
  var ast = gonzo.parse(css);
  ast = traverseAST(ast, browser);
  return gonzo.toCSS(ast);
};

exports.transformAST = function transformAst(ast, browser) {
  return traverseAST(ast, browser);
};

exports.browsers = Object.keys(browsers);

exports.stringGetStringIdStringFromUserAgentSring = function(ua) {
  if (ua.indexOf('Firefox') !== -1) {
    return 'firefox';
  } else if (ua.indexOf(' OPR/') !== -1) {
    return 'opera';
  } else if (ua.indexOf('Chrome') !== -1) {
    return 'chrome';
  } else if (ua.indexOf('Safari') !== -1) {
    var name = 'safari';
    if (ua.indexOf('Mobile') !== -1) {
      return 'ios'
    }
    return name;
  } else if (ua.indexOf('Trident/7') !== -1) {
    return 'ie11';
  } else if (ua.indexOf('MSIE 10') !== -1) {
    return 'ie10';
  } else if (ua.indexOf('MSIE 9') !== -1) {
    return 'ie9';
  } else if (ua.indexOf('MSIE 8') !== -1) {
    return 'ie8';
  } else if (ua.indexOf('MSIE 7') !== -1) {
    return 'ie7';
  } else if (ua.indexOf('MSIE 6') !== -1) {
    return 'ie6';
  }
};

},{"./visitors/empty-delimiters.js":4,"./visitors/iehacks.js":5,"./visitors/media-queries.js":6,"./visitors/prefix.js":7,"./visitors/props.js":8,"cssprops":22,"gonzales-ast":23}],4:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    return name === 'block';
  },

  process: function(node) {
    var newnode = [];
    for (var i = 0; i < node.length; i++) {
      if (node[i][0] !== 'decldelim') {
        // not interesting, push and keep going
        newnode.push(node[i]);
        continue;
      }
      if (i === 1) { // No previous node, skip
        continue;
      }

      // If the previous node is space, remove both the
      // space and skip the delimiter
      var prev = node[i - 1];
      if (prev[0] === 's') {
        newnode.splice(i - 1, 1);
      } else {
        newnode.push(node[i]);
      }
    }
    return newnode;
  }

};

},{}],5:[function(require,module,exports){
// TODO: support \9 at the end of a value
// requires gonzales fix
// filed bug #9, oh sweet irony
// https://github.com/css/gonzales/issues/9

module.exports = {

  test: function(name, nodes) {
    // only looking for * or _ in front of a property
    if (name !== 'declaration') {
      return false;
    }
    var first = nodes[1][1].charAt(0);
    return first === '_' || first === '*';
  },

  process: function(node) {
    // if the prefix is in the map, keep the declaration
    // but strip the prefix first
    // if prefix not in the map, drop the declaration
    var prop = node[1][1][1];

    if (this.hacksMap[prop.charAt(0)]) { // it's a keeper!
      node[1][1][1] = prop.substring(1);
      return node;
    }
    return false;
  },

  hacksMap: {},

  setAllowedHacks: function(hacks) {
    var map = this.hacksMap = {};
    hacks.forEach(function(h) {
      map[h] = 1;
    });
    return this;
  }

};

},{}],6:[function(require,module,exports){
// @media screen, projection AND (color) {}
/*
['stylesheet',
  ['atruler',
    ['atkeyword',
      ['ident', 'media']],
    ['atrulerq',
      ['s', ' '],
      ['ident', 'screen'],
      ['operator', ','],
      ['s', ' '],
      ['ident', 'projection'],
      ['s', ' '],
      ['ident', 'AND'],
      ['s', ' '],
      ['braces', '(', ')',
        ['ident', 'color']],
      ['s', ' ']],
    ['atrulers']]]
*/

module.exports = {

  test: function(name, nodes) {
    return name === 'atruler' && nodes[1][1] === 'media';
  },

  process: function(node) {
    var query = node[2];
    for (var i = 0; i < query.length; i++) {
      if (query[i][0] === 'braces') {
        return false;
      }
      if (query[i][0] === 'ident' &&
          this.unsupported.indexOf(query[i][1]) !== -1) {
        return false;
      }
    }
    return node;
  },

  unsupported: ['AND', 'NOT', 'OR']
};

},{}],7:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    // only looking for prefixed properties
    // node is e.g. [ 'property', [ 'ident', '-webkit-border-radius' ] ]
    return name === 'declaration' && nodes[1][1].charAt(0) === '-';
  },

  process: function(node) {
    // if wrong for the current browser, drop the declaration
    if (node[1][1][1].indexOf(this.prefix) !== 0) {
      return false;
    }
    return node;
  },

  prefix: null,

  setAllowedPrefix: function(prefix) {
    this.prefix = '-' + prefix + '-';
    return this;
  },

  setNoPrefix: function() {
    this.prefix = null;
    return this;
  }

};

},{}],8:[function(require,module,exports){
module.exports = {

  test: function(name, nodes) {
    // prefixes are fine, worry about all others
    return name === 'declaration' && nodes[1][1].charAt(0) !== '-';
  },

  process: function(node) {
    var prop = node[1][1][1];
    if (this.propertyMap[prop]) { // ok, known prop
      return node;
    }
    return false;
  },

  propertyMap: {},

  setProperties: function(allowed) {
    var props = this.propertyMap = {};
    allowed.forEach(function(p) {
      props[p] = 1;
    });
    return this;
  }

};

},{}],9:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "app-region",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-rendering",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "highlight",
  "hyphenate-character",
  "image-rendering",
  "justify-content",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "max-zoom",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "min-zoom",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-action",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "will-change",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],10:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "all",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "binding",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-colors",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-colors",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-colors",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-colors",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-align",
  "box-direction",
  "box-flex",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float-edge",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-language-override",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-synthesis",
  "font-variant",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-ligatures",
  "font-variant-numeric",
  "font-variant-position",
  "font-weight",
  "force-broken-image-icon",
  "height",
  "hyphens",
  "image-orientation",
  "image-region",
  "image-rendering",
  "ime-mode",
  "justify-content",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-offset",
  "marker-start",
  "marks",
  "mask",
  "mask-type",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "mix-blend-mode",
  "opacity",
  "order",
  "orient",
  "orphans",
  "osx-font-smoothing",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-radius",
  "outline-radius-bottomleft",
  "outline-radius-bottomright",
  "outline-radius-topleft",
  "outline-radius-topright",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "resize",
  "right",
  "shape-rendering",
  "size",
  "stack-sizing",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-indent",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-size-adjust",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-focus",
  "user-input",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "window-shadow",
  "word-break",
  "word-spacing",
  "word-wrap",
  "z-index"
];
},{}],11:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "app-region",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-blend-mode",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-rendering",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "highlight",
  "hyphenate-character",
  "image-rendering",
  "justify-content",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "max-zoom",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "min-zoom",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "paint-order",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-image-threshold",
  "shape-margin",
  "shape-outside",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "tab-size",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-action",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "will-change",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom",
  "all",
  "binding",
  "border-bottom-colors",
  "border-left-colors",
  "border-right-colors",
  "border-top-colors",
  "column-fill",
  "float-edge",
  "font-language-override",
  "font-size-adjust",
  "font-synthesis",
  "font-variant-alternates",
  "font-variant-caps",
  "font-variant-east-asian",
  "font-variant-numeric",
  "font-variant-position",
  "force-broken-image-icon",
  "hyphens",
  "image-orientation",
  "image-region",
  "ime-mode",
  "marker-offset",
  "marks",
  "mix-blend-mode",
  "orient",
  "osx-font-smoothing",
  "outline-radius",
  "outline-radius-bottomleft",
  "outline-radius-bottomright",
  "outline-radius-topleft",
  "outline-radius-topright",
  "stack-sizing",
  "text-align-last",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-size-adjust",
  "user-focus",
  "user-input",
  "window-shadow",
  "accelerator",
  "block-progression",
  "break-after",
  "break-before",
  "break-inside",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "flex-align",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flow-from",
  "flow-into",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "ime-align",
  "interpolation-mode",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "overflow-style",
  "ruby-align",
  "ruby-overhang",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "text-autospace",
  "text-combine-horizontal",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-underline-position",
  "touch-select",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "color-correction",
  "color-profile",
  "column-axis",
  "column-progression",
  "composition-fill-color",
  "composition-frame-color",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "line-align",
  "line-grid",
  "line-snap",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask-attachment",
  "match-nearest-mail-blockquote-color",
  "nbsp-mode",
  "overflow-scrolling",
  "svg-shadow",
  "text-line-through",
  "text-overline",
  "text-underline",
  "touch-callout",
  "accesskey",
  "audio-level",
  "dashboard-region",
  "display-align",
  "input-format",
  "input-required",
  "line-increment",
  "link",
  "link-source",
  "marquee-dir",
  "marquee-loop",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "scrollbar-darkshadow-color",
  "scrollbar3dlight-color",
  "solid-color",
  "solid-opacity",
  "table-baseline",
  "viewport-fill",
  "viewport-fill-opacity",
  "cursor-visibility",
  "grid-after",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-before",
  "grid-end",
  "grid-start",
  "region-break-after",
  "region-break-before",
  "region-break-inside",
  "region-fragment"
];
},{}],12:[function(require,module,exports){
module.exports = [
  "accelerator",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-align",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flex-shrink",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "height",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "hyphens",
  "ime-align",
  "ime-mode",
  "interpolation-mode",
  "justify-content",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-style",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-combine-horizontal",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "top",
  "touch-action",
  "touch-select",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-select",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],13:[function(require,module,exports){
module.exports = [
  "accelerator",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation-filters",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "content-zoom-chaining",
  "content-zoom-limit",
  "content-zoom-limit-max",
  "content-zoom-limit-min",
  "content-zoom-snap",
  "content-zoom-snap-points",
  "content-zoom-snap-type",
  "content-zooming",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-align",
  "flex-direction",
  "flex-flow",
  "flex-item-align",
  "flex-line-pack",
  "flex-negative",
  "flex-order",
  "flex-pack",
  "flex-positive",
  "flex-preferred-size",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-column-align",
  "grid-column-span",
  "grid-columns",
  "grid-row",
  "grid-row-align",
  "grid-row-span",
  "grid-rows",
  "height",
  "high-contrast-adjust",
  "hyphenate-limit-chars",
  "hyphenate-limit-lines",
  "hyphenate-limit-zone",
  "hyphens",
  "ime-mode",
  "interpolation-mode",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-style",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scroll-chaining",
  "scroll-limit",
  "scroll-limit-x-max",
  "scroll-limit-x-min",
  "scroll-limit-y-max",
  "scroll-limit-y-min",
  "scroll-rails",
  "scroll-snap-points-x",
  "scroll-snap-points-y",
  "scroll-snap-type",
  "scroll-snap-x",
  "scroll-snap-y",
  "scroll-translation",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "text-underline-position",
  "top",
  "touch-action",
  "touch-select",
  "transform",
  "transform-origin",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-select",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "wrap-flow",
  "wrap-margin",
  "wrap-through",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],14:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}],15:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "clear",
  "clip",
  "color",
  "cursor",
  "direction",
  "display",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "min-height",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "position",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "zoom"
];
},{}],16:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "clear",
  "clip",
  "color",
  "cursor",
  "direction",
  "display",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "interpolation-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "position",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "zoom"
];
},{}],17:[function(require,module,exports){
module.exports = [
  "accelerator",
  "background",
  "background-attachment",
  "background-color",
  "background-image",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "empty-cells",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant",
  "font-weight",
  "height",
  "ime-mode",
  "interpolation-mode",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],18:[function(require,module,exports){
module.exports = [
  "accelerator",
  "alignment-baseline",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "behavior",
  "block-progression",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "font",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "ime-mode",
  "interpolation-mode",
  "kerning",
  "layout-flow",
  "layout-grid",
  "layout-grid-char",
  "layout-grid-line",
  "layout-grid-mode",
  "layout-grid-type",
  "left",
  "letter-spacing",
  "line-break",
  "line-height",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "mask",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "pointer-events",
  "position",
  "quotes",
  "right",
  "ruby-align",
  "ruby-overhang",
  "ruby-position",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-dark-shadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3d-light-color",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "table-layout",
  "text-align",
  "text-align-last",
  "text-anchor",
  "text-autospace",
  "text-decoration",
  "text-indent",
  "text-justify",
  "text-justify-trim",
  "text-kashida",
  "text-kashida-space",
  "text-overflow",
  "text-transform",
  "text-underline-position",
  "top",
  "transform",
  "transform-origin",
  "unicode-bidi",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],19:[function(require,module,exports){
module.exports = [
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-correction",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-axis",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-progression",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "composition-fill-color",
  "composition-frame-color",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "float",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-column",
  "grid-columns",
  "grid-row",
  "grid-rows",
  "height",
  "highlight",
  "hyphenate-character",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "hyphenate-limit-lines",
  "hyphens",
  "image-rendering",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-align",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-grid",
  "line-height",
  "line-snap",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask",
  "mask-attachment",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "match-nearest-mail-blockquote-color",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "nbsp-mode",
  "opacity",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-scrolling",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "resize",
  "right",
  "rtl-ordering",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "svg-shadow",
  "table-layout",
  "tap-highlight-color",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-size-adjust",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "touch-callout",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],20:[function(require,module,exports){
module.exports = [
  "accesskey",
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "audio-level",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-image",
  "background-origin",
  "background-position",
  "background-repeat",
  "background-size",
  "baseline-shift",
  "border",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-image",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-width",
  "bottom",
  "box-decoration-break",
  "box-shadow",
  "box-sizing",
  "break-after",
  "break-before",
  "break-inside",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-count",
  "column-fill",
  "column-gap",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "dashboard-region",
  "direction",
  "display",
  "display-align",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "flood-color",
  "flood-opacity",
  "font",
  "font-family",
  "font-size",
  "font-size-adjust",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "height",
  "image-rendering",
  "input-format",
  "input-required",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-height",
  "line-increment",
  "link",
  "link-source",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-offset",
  "marker-start",
  "marquee-dir",
  "marquee-loop",
  "marquee-speed",
  "marquee-style",
  "mask",
  "max-height",
  "max-width",
  "max-zoom",
  "min-height",
  "min-width",
  "min-zoom",
  "nav-down",
  "nav-index",
  "nav-left",
  "nav-right",
  "nav-up",
  "object-fit",
  "object-position",
  "opacity",
  "order",
  "orientation",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "pointer-events",
  "position",
  "quotes",
  "resize",
  "right",
  "scrollbar-arrow-color",
  "scrollbar-base-color",
  "scrollbar-darkshadow-color",
  "scrollbar-face-color",
  "scrollbar-highlight-color",
  "scrollbar-shadow-color",
  "scrollbar-track-color",
  "scrollbar3dlight-color",
  "shape-rendering",
  "size",
  "solid-color",
  "solid-opacity",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "style-float",
  "tab-size",
  "table-baseline",
  "table-layout",
  "text-align",
  "text-anchor",
  "text-decoration",
  "text-indent",
  "text-overflow",
  "text-rendering",
  "text-shadow",
  "text-transform",
  "top",
  "transform",
  "transform-origin",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "user-zoom",
  "vector-effect",
  "vertical-align",
  "viewport-fill",
  "viewport-fill-opacity",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],21:[function(require,module,exports){
module.exports = [
  "align-content",
  "align-items",
  "align-self",
  "alignment-baseline",
  "animation",
  "animation-delay",
  "animation-direction",
  "animation-duration",
  "animation-fill-mode",
  "animation-iteration-count",
  "animation-name",
  "animation-play-state",
  "animation-timing-function",
  "appearance",
  "aspect-ratio",
  "backface-visibility",
  "background",
  "background-attachment",
  "background-clip",
  "background-color",
  "background-composite",
  "background-image",
  "background-origin",
  "background-position",
  "background-position-x",
  "background-position-y",
  "background-repeat",
  "background-repeat-x",
  "background-repeat-y",
  "background-size",
  "baseline-shift",
  "border",
  "border-after",
  "border-after-color",
  "border-after-style",
  "border-after-width",
  "border-before",
  "border-before-color",
  "border-before-style",
  "border-before-width",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-style",
  "border-bottom-width",
  "border-collapse",
  "border-color",
  "border-end",
  "border-end-color",
  "border-end-style",
  "border-end-width",
  "border-fit",
  "border-horizontal-spacing",
  "border-image",
  "border-image-outset",
  "border-image-repeat",
  "border-image-slice",
  "border-image-source",
  "border-image-width",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-spacing",
  "border-start",
  "border-start-color",
  "border-start-style",
  "border-start-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-style",
  "border-top-width",
  "border-vertical-spacing",
  "border-width",
  "bottom",
  "box-align",
  "box-decoration-break",
  "box-direction",
  "box-flex",
  "box-flex-group",
  "box-lines",
  "box-ordinal-group",
  "box-orient",
  "box-pack",
  "box-reflect",
  "box-shadow",
  "box-sizing",
  "buffered-rendering",
  "caption-side",
  "clear",
  "clip",
  "clip-path",
  "clip-rule",
  "color",
  "color-correction",
  "color-interpolation",
  "color-interpolation-filters",
  "color-profile",
  "color-rendering",
  "column-axis",
  "column-break-after",
  "column-break-before",
  "column-break-inside",
  "column-count",
  "column-gap",
  "column-progression",
  "column-rule",
  "column-rule-color",
  "column-rule-style",
  "column-rule-width",
  "column-span",
  "column-width",
  "columns",
  "content",
  "counter-increment",
  "counter-reset",
  "cursor",
  "cursor-visibility",
  "dashboard-region",
  "direction",
  "display",
  "dominant-baseline",
  "empty-cells",
  "enable-background",
  "fill",
  "fill-opacity",
  "fill-rule",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-flow",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "float",
  "flood-color",
  "flood-opacity",
  "flow-from",
  "flow-into",
  "font",
  "font-family",
  "font-feature-settings",
  "font-kerning",
  "font-size",
  "font-size-delta",
  "font-smoothing",
  "font-stretch",
  "font-style",
  "font-variant",
  "font-variant-ligatures",
  "font-weight",
  "glyph-orientation-horizontal",
  "glyph-orientation-vertical",
  "grid-after",
  "grid-auto-columns",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-before",
  "grid-column",
  "grid-columns",
  "grid-end",
  "grid-row",
  "grid-rows",
  "grid-start",
  "height",
  "highlight",
  "hyphenate-character",
  "hyphenate-limit-after",
  "hyphenate-limit-before",
  "hyphenate-limit-lines",
  "hyphens",
  "image-rendering",
  "justify-content",
  "kerning",
  "left",
  "letter-spacing",
  "lighting-color",
  "line-align",
  "line-box-contain",
  "line-break",
  "line-clamp",
  "line-grid",
  "line-height",
  "line-snap",
  "list-style",
  "list-style-image",
  "list-style-position",
  "list-style-type",
  "locale",
  "logical-height",
  "logical-width",
  "margin",
  "margin-after",
  "margin-after-collapse",
  "margin-before",
  "margin-before-collapse",
  "margin-bottom",
  "margin-bottom-collapse",
  "margin-collapse",
  "margin-end",
  "margin-left",
  "margin-right",
  "margin-start",
  "margin-top",
  "margin-top-collapse",
  "marker",
  "marker-end",
  "marker-mid",
  "marker-start",
  "marquee",
  "marquee-direction",
  "marquee-increment",
  "marquee-repetition",
  "marquee-speed",
  "marquee-style",
  "mask",
  "mask-box-image",
  "mask-box-image-outset",
  "mask-box-image-repeat",
  "mask-box-image-slice",
  "mask-box-image-source",
  "mask-box-image-width",
  "mask-clip",
  "mask-composite",
  "mask-image",
  "mask-origin",
  "mask-position",
  "mask-position-x",
  "mask-position-y",
  "mask-repeat",
  "mask-repeat-x",
  "mask-repeat-y",
  "mask-size",
  "mask-type",
  "max-height",
  "max-logical-height",
  "max-logical-width",
  "max-width",
  "min-height",
  "min-logical-height",
  "min-logical-width",
  "min-width",
  "nbsp-mode",
  "opacity",
  "order",
  "orphans",
  "outline",
  "outline-color",
  "outline-offset",
  "outline-style",
  "outline-width",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-after",
  "padding-before",
  "padding-bottom",
  "padding-end",
  "padding-left",
  "padding-right",
  "padding-start",
  "padding-top",
  "page",
  "page-break-after",
  "page-break-before",
  "page-break-inside",
  "perspective",
  "perspective-origin",
  "perspective-origin-x",
  "perspective-origin-y",
  "pointer-events",
  "position",
  "print-color-adjust",
  "quotes",
  "region-break-after",
  "region-break-before",
  "region-break-inside",
  "region-fragment",
  "resize",
  "right",
  "rtl-ordering",
  "ruby-position",
  "shape-rendering",
  "size",
  "speak",
  "src",
  "stop-color",
  "stop-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "svg-shadow",
  "tab-size",
  "table-layout",
  "text-align",
  "text-anchor",
  "text-combine",
  "text-decoration",
  "text-decorations-in-effect",
  "text-emphasis",
  "text-emphasis-color",
  "text-emphasis-position",
  "text-emphasis-style",
  "text-fill-color",
  "text-indent",
  "text-line-through",
  "text-line-through-color",
  "text-line-through-mode",
  "text-line-through-style",
  "text-line-through-width",
  "text-orientation",
  "text-overflow",
  "text-overline",
  "text-overline-color",
  "text-overline-mode",
  "text-overline-style",
  "text-overline-width",
  "text-rendering",
  "text-security",
  "text-shadow",
  "text-stroke",
  "text-stroke-color",
  "text-stroke-width",
  "text-transform",
  "text-underline",
  "text-underline-color",
  "text-underline-mode",
  "text-underline-style",
  "text-underline-width",
  "top",
  "transform",
  "transform-origin",
  "transform-origin-x",
  "transform-origin-y",
  "transform-origin-z",
  "transform-style",
  "transition",
  "transition-delay",
  "transition-duration",
  "transition-property",
  "transition-timing-function",
  "unicode-bidi",
  "unicode-range",
  "user-drag",
  "user-modify",
  "user-select",
  "vector-effect",
  "vertical-align",
  "visibility",
  "white-space",
  "widows",
  "width",
  "word-break",
  "word-spacing",
  "word-wrap",
  "writing-mode",
  "z-index",
  "zoom"
];
},{}],22:[function(require,module,exports){
exports.chrome = require("./browsers/chrome.js");
exports.firefox = require("./browsers/firefox.js");
exports.ie10 = require("./browsers/ie10.js");
exports.ie11 = require("./browsers/ie11.js");
exports.ie = require("./browsers/ie.js");
exports.ie6 = require("./browsers/ie6.js");
exports.ie7 = require("./browsers/ie7.js");
exports.ie8 = require("./browsers/ie8.js");
exports.ie9 = require("./browsers/ie9.js");
exports.ios = require("./browsers/ios.js");
exports.opera = require("./browsers/opera.js");
exports.safari = require("./browsers/safari.js");
exports.forward = require("./browsers/forward.js");

},{"./browsers/chrome.js":9,"./browsers/firefox.js":10,"./browsers/forward.js":11,"./browsers/ie.js":12,"./browsers/ie10.js":13,"./browsers/ie11.js":14,"./browsers/ie6.js":15,"./browsers/ie7.js":16,"./browsers/ie8.js":17,"./browsers/ie9.js":18,"./browsers/ios.js":19,"./browsers/opera.js":20,"./browsers/safari.js":21}],23:[function(require,module,exports){
var gonzales = require('gonzales');
var traverse = require('./lib/traverse.js');
var utils = require('./lib/utils.js');

exports.parse = gonzales.srcToCSSP;
exports.toCSS = gonzales.csspToSrc;
exports.toTree = gonzales.csspToTree;
exports.traverse = traverse;
exports.same = utils.same;
exports.pretty = function(ast) {
  return JSON.stringify(ast, '', 2);
};
},{"./lib/traverse.js":24,"./lib/utils.js":25,"gonzales":28}],24:[function(require,module,exports){
function tree(node, visitor) {
  if (!Array.isArray(node)) {
    return node;
  }

  if (visitor.test && visitor.test(node[0], node[1])) {
    node = visitor.process(node);
    if (!node) {
      return;
    }
  }

  var res = [node[0]];
  for (var i = 1; i < node.length; i++) {
    var n = tree(node[i], visitor);
    n != undefined && res.push(n);
  }
  return res;
}


module.exports = function traverse (ast, visitors) {
  visitors.forEach(function(visitor) {
    ast = tree(ast, visitor);
  });
  return ast;
};

},{}],25:[function(require,module,exports){
exports.same = function same (ast1, ast2) {
  return JSON.stringify(ast1) === JSON.stringify(ast2);
};

},{}],26:[function(require,module,exports){
// version: 1.0.0

function csspToSrc(tree, hasInfo) {

    var _m_simple = {
            'unary': 1, 'nth': 1, 'combinator': 1, 'ident': 1, 'number': 1, 's': 1,
            'string': 1, 'attrselector': 1, 'operator': 1, 'raw': 1, 'unknown': 1
        },
        _m_composite = {
            'simpleselector': 1, 'dimension': 1, 'selector': 1, 'property': 1, 'value': 1,
            'filterv': 1, 'progid': 1, 'ruleset': 1, 'atruleb': 1, 'atrulerq': 1, 'atrulers': 1,
            'stylesheet': 1
        },
        _m_primitive = {
            'cdo': 'cdo', 'cdc': 'cdc', 'decldelim': ';', 'namespace': '|', 'delim': ','
        };

    function _t(tree) {
        var t = tree[hasInfo? 1 : 0];
        if (t in _m_primitive) return _m_primitive[t];
        else if (t in _m_simple) return _simple(tree);
        else if (t in _m_composite) return _composite(tree);
        return _unique[t](tree);
    }

    function _composite(t, i) {
        var s = '';
        i = i === undefined ? (hasInfo? 2 : 1) : i;
        for (; i < t.length; i++) s += _t(t[i]);
        return s;
    }

    function _simple(t) {
        return t[hasInfo? 2 : 1];
    }

    var _unique = {
        percentage: function(t) {
            return _t(t[hasInfo? 2 : 1]) + '%';
        },
        comment: function (t) {
            return '/*' + t[hasInfo? 2 : 1] + '*/';
        },
        clazz: function(t) {
            return '.' + _t(t[hasInfo? 2 : 1]);
        },
        atkeyword: function(t) {
            return '@' + _t(t[hasInfo? 2 : 1]);
        },
        shash: function (t) {
            return '#' + t[hasInfo? 2 : 1];
        },
        vhash: function(t) {
            return '#' + t[hasInfo? 2 : 1];
        },
        attrib: function(t) {
            return '[' + _composite(t) + ']';
        },
        important: function(t) {
            return '!' + _composite(t) + 'important';
        },
        nthselector: function(t) {
            return ':' + _simple(t[hasInfo? 2 : 1]) + '(' + _composite(t, hasInfo? 3 : 2) + ')';
        },
        funktion: function(t) {
            return _simple(t[hasInfo? 2 : 1]) + '(' + _composite(t[hasInfo? 3: 2]) + ')';
        },
        declaration: function(t) {
            return _t(t[hasInfo? 2 : 1]) + ':' + _t(t[hasInfo? 3 : 2]);
        },
        filter: function(t) {
            return _t(t[hasInfo? 2 : 1]) + ':' + _t(t[hasInfo? 3 : 2]);
        },
        block: function(t) {
            return '{' + _composite(t) + '}';
        },
        braces: function(t) {
            return t[hasInfo? 2 : 1] + _composite(t, hasInfo? 4 : 3) + t[hasInfo? 3 : 2];
        },
        atrules: function(t) {
            return _composite(t) + ';';
        },
        atruler: function(t) {
            return _t(t[hasInfo? 2 : 1]) + _t(t[hasInfo? 3 : 2]) + '{' + _t(t[hasInfo? 4 : 3]) + '}';
        },
        pseudoe: function(t) {
            return '::' + _t(t[hasInfo? 2 : 1]);
        },
        pseudoc: function(t) {
            return ':' + _t(t[hasInfo? 2 : 1]);
        },
        uri: function(t) {
            return 'url(' + _composite(t) + ')';
        },
        functionExpression: function(t) {
            return 'expression(' + t[hasInfo? 2 : 1] + ')';
        }
    };

    return _t(tree);
}
exports.csspToSrc = csspToSrc;

},{}],27:[function(require,module,exports){
var srcToCSSP = (function() {
var TokenType = {
    StringSQ: 'StringSQ',
    StringDQ: 'StringDQ',
    CommentML: 'CommentML',
    CommentSL: 'CommentSL',

    Newline: 'Newline',
    Space: 'Space',
    Tab: 'Tab',

    ExclamationMark: 'ExclamationMark',         // !
    QuotationMark: 'QuotationMark',             // "
    NumberSign: 'NumberSign',                   // #
    DollarSign: 'DollarSign',                   // $
    PercentSign: 'PercentSign',                 // %
    Ampersand: 'Ampersand',                     // &
    Apostrophe: 'Apostrophe',                   // '
    LeftParenthesis: 'LeftParenthesis',         // (
    RightParenthesis: 'RightParenthesis',       // )
    Asterisk: 'Asterisk',                       // *
    PlusSign: 'PlusSign',                       // +
    Comma: 'Comma',                             // ,
    HyphenMinus: 'HyphenMinus',                 // -
    FullStop: 'FullStop',                       // .
    Solidus: 'Solidus',                         // /
    Colon: 'Colon',                             // :
    Semicolon: 'Semicolon',                     // ;
    LessThanSign: 'LessThanSign',               // <
    EqualsSign: 'EqualsSign',                   // =
    GreaterThanSign: 'GreaterThanSign',         // >
    QuestionMark: 'QuestionMark',               // ?
    CommercialAt: 'CommercialAt',               // @
    LeftSquareBracket: 'LeftSquareBracket',     // [
    ReverseSolidus: 'ReverseSolidus',           // \
    RightSquareBracket: 'RightSquareBracket',   // ]
    CircumflexAccent: 'CircumflexAccent',       // ^
    LowLine: 'LowLine',                         // _
    LeftCurlyBracket: 'LeftCurlyBracket',       // {
    VerticalLine: 'VerticalLine',               // |
    RightCurlyBracket: 'RightCurlyBracket',     // }
    Tilde: 'Tilde',                             // ~

    Identifier: 'Identifier',
    DecimalNumber: 'DecimalNumber'
};

var getTokens = (function() {

    var Punctuation,
        urlMode = false,
        blockMode = 0;

    Punctuation = {
        ' ': TokenType.Space,
        '\n': TokenType.Newline,
        '\r': TokenType.Newline,
        '\t': TokenType.Tab,
        '!': TokenType.ExclamationMark,
        '"': TokenType.QuotationMark,
        '#': TokenType.NumberSign,
        '$': TokenType.DollarSign,
        '%': TokenType.PercentSign,
        '&': TokenType.Ampersand,
        '\'': TokenType.Apostrophe,
        '(': TokenType.LeftParenthesis,
        ')': TokenType.RightParenthesis,
        '*': TokenType.Asterisk,
        '+': TokenType.PlusSign,
        ',': TokenType.Comma,
        '-': TokenType.HyphenMinus,
        '.': TokenType.FullStop,
        '/': TokenType.Solidus,
        ':': TokenType.Colon,
        ';': TokenType.Semicolon,
        '<': TokenType.LessThanSign,
        '=': TokenType.EqualsSign,
        '>': TokenType.GreaterThanSign,
        '?': TokenType.QuestionMark,
        '@': TokenType.CommercialAt,
        '[': TokenType.LeftSquareBracket,
    //        '\\': TokenType.ReverseSolidus,
        ']': TokenType.RightSquareBracket,
        '^': TokenType.CircumflexAccent,
        '_': TokenType.LowLine,
        '{': TokenType.LeftCurlyBracket,
        '|': TokenType.VerticalLine,
        '}': TokenType.RightCurlyBracket,
        '~': TokenType.Tilde
    };

    function isDecimalDigit(c) {
        return '0123456789'.indexOf(c) >= 0;
    }

    function throwError(message) {
        throw message;
    }

    var buffer = '',
        tokens = [],
        pos,
        tn = 0,
        ln = 1;

    function _getTokens(s) {
        if (!s) return [];

        tokens = [];

        var c, cn;

        for (pos = 0; pos < s.length; pos++) {
            c = s.charAt(pos);
            cn = s.charAt(pos + 1);

            if (c === '/' && cn === '*') {
                parseMLComment(s);
            } else if (!urlMode && c === '/' && cn === '/') {
                if (blockMode > 0) parseIdentifier(s); 
                else parseSLComment(s);
            } else if (c === '"' || c === "'") {
                parseString(s, c);
            } else if (c === ' ') {
                parseSpaces(s)
            } else if (c in Punctuation) {
                pushToken(Punctuation[c], c);
                if (c === '\n' || c === '\r') ln++;
                if (c === ')') urlMode = false;
                if (c === '{') blockMode++;
                if (c === '}') blockMode--;
            } else if (isDecimalDigit(c)) {
                parseDecimalNumber(s);
            } else {
                parseIdentifier(s);
            }
        }

        mark();

        return tokens;
    }

    function pushToken(type, value) {
        tokens.push({ tn: tn++, ln: ln, type: type, value: value });
    }

    function parseSpaces(s) {
        var start = pos;

        for (; pos < s.length; pos++) {
            if (s.charAt(pos) !== ' ') break;
        }

        pushToken(TokenType.Space, s.substring(start, pos));
        pos--;
    }

    function parseMLComment(s) {
        var start = pos;

        for (pos = pos + 2; pos < s.length; pos++) {
            if (s.charAt(pos) === '*') {
                if (s.charAt(pos + 1) === '/') {
                    pos++;
                    break;
                }
            }
        }

        pushToken(TokenType.CommentML, s.substring(start, pos + 1));
    }

    function parseSLComment(s) {
        var start = pos;

        for (pos = pos + 2; pos < s.length; pos++) {
            if (s.charAt(pos) === '\n' || s.charAt(pos) === '\r') {
                pos++;
                break;
            }
        }

        pushToken(TokenType.CommentSL, s.substring(start, pos));
        pos--;
    }

    function parseString(s, q) {
        var start = pos;

        for (pos = pos + 1; pos < s.length; pos++) {
            if (s.charAt(pos) === '\\') pos++;
            else if (s.charAt(pos) === q) break;
        }

        pushToken(q === '"' ? TokenType.StringDQ : TokenType.StringSQ, s.substring(start, pos + 1));
    }

    function parseDecimalNumber(s) {
        var start = pos;

        for (; pos < s.length; pos++) {
            if (!isDecimalDigit(s.charAt(pos))) break;
        }

        pushToken(TokenType.DecimalNumber, s.substring(start, pos));
        pos--;
    }

    function parseIdentifier(s) {
        var start = pos;

        while (s.charAt(pos) === '/') pos++;

        for (; pos < s.length; pos++) {
            if (s.charAt(pos) === '\\') pos++;
            else if (s.charAt(pos) in Punctuation) break;
        }

        var ident = s.substring(start, pos);

        urlMode = urlMode || ident === 'url';

        pushToken(TokenType.Identifier, ident);
        pos--;
    }

    // ====================================
    // second run
    // ====================================

    function mark() {
        var ps = [], // Parenthesis
            sbs = [], // SquareBracket
            cbs = [], // CurlyBracket
            t;

        for (var i = 0; i < tokens.length; i++) {
            t = tokens[i];
            switch(t.type) {
                case TokenType.LeftParenthesis:
                    ps.push(i);
                    break;
                case TokenType.RightParenthesis:
                    if (ps.length) {
                        t.left = ps.pop();
                        tokens[t.left].right = i;
                    }
                    break;
                case TokenType.LeftSquareBracket:
                    sbs.push(i);
                    break;
                case TokenType.RightSquareBracket:
                    if (sbs.length) {
                        t.left = sbs.pop();
                        tokens[t.left].right = i;
                    }
                    break;
                case TokenType.LeftCurlyBracket:
                    cbs.push(i);
                    break;
                case TokenType.RightCurlyBracket:
                    if (cbs.length) {
                        t.left = cbs.pop();
                        tokens[t.left].right = i;
                    }
                    break;
            }
        }
    }

    return function(s) {
        return _getTokens(s);
    };

}());
// version: 1.0.0

var getCSSPAST = (function() {

    var tokens,
        pos,
        failLN = 0,
        currentBlockLN = 0,
        needInfo = false;

    var CSSPNodeType,
        CSSLevel,
        CSSPRules;

    CSSPNodeType = {
        IdentType: 'ident',
        AtkeywordType: 'atkeyword',
        StringType: 'string',
        ShashType: 'shash',
        VhashType: 'vhash',
        NumberType: 'number',
        PercentageType: 'percentage',
        DimensionType: 'dimension',
        CdoType: 'cdo',
        CdcType: 'cdc',
        DecldelimType: 'decldelim',
        SType: 's',
        AttrselectorType: 'attrselector',
        AttribType: 'attrib',
        NthType: 'nth',
        NthselectorType: 'nthselector',
        NamespaceType: 'namespace',
        ClazzType: 'clazz',
        PseudoeType: 'pseudoe',
        PseudocType: 'pseudoc',
        DelimType: 'delim',
        StylesheetType: 'stylesheet',
        AtrulebType: 'atruleb',
        AtrulesType: 'atrules',
        AtrulerqType: 'atrulerq',
        AtrulersType: 'atrulers',
        AtrulerType: 'atruler',
        BlockType: 'block',
        RulesetType: 'ruleset',
        CombinatorType: 'combinator',
        SimpleselectorType: 'simpleselector',
        SelectorType: 'selector',
        DeclarationType: 'declaration',
        PropertyType: 'property',
        ImportantType: 'important',
        UnaryType: 'unary',
        OperatorType: 'operator',
        BracesType: 'braces',
        ValueType: 'value',
        ProgidType: 'progid',
        FiltervType: 'filterv',
        FilterType: 'filter',
        CommentType: 'comment',
        UriType: 'uri',
        RawType: 'raw',
        FunctionBodyType: 'functionBody',
        FunktionType: 'funktion',
        FunctionExpressionType: 'functionExpression',
        UnknownType: 'unknown'
    };

    CSSPRules = {
        'ident': function() { if (checkIdent(pos)) return getIdent() },
        'atkeyword': function() { if (checkAtkeyword(pos)) return getAtkeyword() },
        'string': function() { if (checkString(pos)) return getString() },
        'shash': function() { if (checkShash(pos)) return getShash() },
        'vhash': function() { if (checkVhash(pos)) return getVhash() },
        'number': function() { if (checkNumber(pos)) return getNumber() },
        'percentage': function() { if (checkPercentage(pos)) return getPercentage() },
        'dimension': function() { if (checkDimension(pos)) return getDimension() },
//        'cdo': function() { if (checkCDO()) return getCDO() },
//        'cdc': function() { if (checkCDC()) return getCDC() },
        'decldelim': function() { if (checkDecldelim(pos)) return getDecldelim() },
        's': function() { if (checkS(pos)) return getS() },
        'attrselector': function() { if (checkAttrselector(pos)) return getAttrselector() },
        'attrib': function() { if (checkAttrib(pos)) return getAttrib() },
        'nth': function() { if (checkNth(pos)) return getNth() },
        'nthselector': function() { if (checkNthselector(pos)) return getNthselector() },
        'namespace': function() { if (checkNamespace(pos)) return getNamespace() },
        'clazz': function() { if (checkClazz(pos)) return getClazz() },
        'pseudoe': function() { if (checkPseudoe(pos)) return getPseudoe() },
        'pseudoc': function() { if (checkPseudoc(pos)) return getPseudoc() },
        'delim': function() { if (checkDelim(pos)) return getDelim() },
        'stylesheet': function() { if (checkStylesheet(pos)) return getStylesheet() },
        'atruleb': function() { if (checkAtruleb(pos)) return getAtruleb() },
        'atrules': function() { if (checkAtrules(pos)) return getAtrules() },
        'atrulerq': function() { if (checkAtrulerq(pos)) return getAtrulerq() },
        'atrulers': function() { if (checkAtrulers(pos)) return getAtrulers() },
        'atruler': function() { if (checkAtruler(pos)) return getAtruler() },
        'block': function() { if (checkBlock(pos)) return getBlock() },
        'ruleset': function() { if (checkRuleset(pos)) return getRuleset() },
        'combinator': function() { if (checkCombinator(pos)) return getCombinator() },
        'simpleselector': function() { if (checkSimpleselector(pos)) return getSimpleSelector() },
        'selector': function() { if (checkSelector(pos)) return getSelector() },
        'declaration': function() { if (checkDeclaration(pos)) return getDeclaration() },
        'property': function() { if (checkProperty(pos)) return getProperty() },
        'important': function() { if (checkImportant(pos)) return getImportant() },
        'unary': function() { if (checkUnary(pos)) return getUnary() },
        'operator': function() { if (checkOperator(pos)) return getOperator() },
        'braces': function() { if (checkBraces(pos)) return getBraces() },
        'value': function() { if (checkValue(pos)) return getValue() },
        'progid': function() { if (checkProgid(pos)) return getProgid() },
        'filterv': function() { if (checkFilterv(pos)) return getFilterv() },
        'filter': function() { if (checkFilter(pos)) return getFilter() },
        'comment': function() { if (checkComment(pos)) return getComment() },
        'uri': function() { if (checkUri(pos)) return getUri() },
        'raw': function() { if (checkRaw(pos)) return getRaw() },
        'funktion': function() { if (checkFunktion(pos)) return getFunktion() },
        'functionExpression': function() { if (checkFunctionExpression(pos)) return getFunctionExpression() },
        'unknown': function() { if (checkUnknown(pos)) return getUnknown() }
    };

    function fail(token) {
        if (token && token.ln > failLN) failLN = token.ln;
    }

    function throwError() {
        throw new Error('Please check the validity of the CSS block starting from the line #' + currentBlockLN);
    }

    function _getAST(_tokens, rule, _needInfo) {
        tokens = _tokens;
        needInfo = _needInfo;
        pos = 0;

        markSC();

        return rule ? CSSPRules[rule]() : CSSPRules['stylesheet']();
    }

//any = braces | string | percentage | dimension | number | uri | functionExpression | funktion | ident | unary
    function checkAny(_i) {
        return checkBraces(_i) ||
               checkString(_i) ||
               checkPercentage(_i) ||
               checkDimension(_i) ||
               checkNumber(_i) ||
               checkUri(_i) ||
               checkFunctionExpression(_i) ||
               checkFunktion(_i) ||
               checkIdent(_i) ||
               checkUnary(_i);
    }

    function getAny() {
        if (checkBraces(pos)) return getBraces();
        else if (checkString(pos)) return getString();
        else if (checkPercentage(pos)) return getPercentage();
        else if (checkDimension(pos)) return getDimension();
        else if (checkNumber(pos)) return getNumber();
        else if (checkUri(pos)) return getUri();
        else if (checkFunctionExpression(pos)) return getFunctionExpression();
        else if (checkFunktion(pos)) return getFunktion();
        else if (checkIdent(pos)) return getIdent();
        else if (checkUnary(pos)) return getUnary();
    }

//atkeyword = '@' ident:x -> [#atkeyword, x]
    function checkAtkeyword(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.CommercialAt) return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) return l + 1;

        return fail(tokens[_i]);
    }

    function getAtkeyword() {
        var startPos = pos;

        pos++;

        return needInfo?
            [{ ln: tokens[startPos].ln }, CSSPNodeType.AtkeywordType, getIdent()]:
            [CSSPNodeType.AtkeywordType, getIdent()];
    }

//attrib = '[' sc*:s0 ident:x sc*:s1 attrselector:a sc*:s2 (ident | string):y sc*:s3 ']' -> this.concat([#attrib], s0, [x], s1, [a], s2, [y], s3)
//       | '[' sc*:s0 ident:x sc*:s1 ']' -> this.concat([#attrib], s0, [x], s1),
    function checkAttrib(_i) {
        if (tokens[_i].type !== TokenType.LeftSquareBracket) return fail(tokens[_i]);

        if (!tokens[_i].right) return fail(tokens[_i]);

        return tokens[_i].right - _i + 1;
    }

    function checkAttrib1(_i) {
        var start = _i;

        _i++;

        var l = checkSC(_i); // s0

        if (l) _i += l;

        if (l = checkIdent(_i)) _i += l; // x
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s1

        if (l = checkAttrselector(_i)) _i += l; // a
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s2

        if ((l = checkIdent(_i)) || (l = checkString(_i))) _i += l; // y
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l; // s3

        if (tokens[_i].type === TokenType.RightSquareBracket) return _i - start;

        return fail(tokens[_i]);
    }

    function getAttrib1() {
        var startPos = pos;

        pos++;

        var a = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.AttribType] : [CSSPNodeType.AttribType])
                .concat(getSC())
                .concat([getIdent()])
                .concat(getSC())
                .concat([getAttrselector()])
                .concat(getSC())
                .concat([checkString(pos)? getString() : getIdent()])
                .concat(getSC());

        pos++;

        return a;
    }

    function checkAttrib2(_i) {
        var start = _i;

        _i++;

        var l = checkSC(_i);

        if (l) _i += l;

        if (l = checkIdent(_i)) _i += l;

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].type === TokenType.RightSquareBracket) return _i - start;

        return fail(tokens[_i]);
    }

    function getAttrib2() {
        var startPos = pos;

        pos++;

        var a = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.AttribType] : [CSSPNodeType.AttribType])
                .concat(getSC())
                .concat([getIdent()])
                .concat(getSC());

        pos++;

        return a;
    }

    function getAttrib() {
        if (checkAttrib1(pos)) return getAttrib1(); 
        if (checkAttrib2(pos)) return getAttrib2(); 
    }

//attrselector = (seq('=') | seq('~=') | seq('^=') | seq('$=') | seq('*=') | seq('|=')):x -> [#attrselector, x]
    function checkAttrselector(_i) {
        if (tokens[_i].type === TokenType.EqualsSign) return 1;
        if (tokens[_i].type === TokenType.VerticalLine && (!tokens[_i + 1] || tokens[_i + 1].type !== TokenType.EqualsSign)) return 1;

        if (!tokens[_i + 1] || tokens[_i + 1].type !== TokenType.EqualsSign) return fail(tokens[_i]);

        switch(tokens[_i].type) {
            case TokenType.Tilde:
            case TokenType.CircumflexAccent:
            case TokenType.DollarSign:
            case TokenType.Asterisk:
            case TokenType.VerticalLine:
                return 2;
        }

        return fail(tokens[_i]);
    }

    function getAttrselector() {
        var startPos = pos,
            s = tokens[pos++].value;

        if (tokens[pos] && tokens[pos].type === TokenType.EqualsSign) s += tokens[pos++].value;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.AttrselectorType, s] :
                [CSSPNodeType.AttrselectorType, s];
    }

//atrule = atruler | atruleb | atrules
    function checkAtrule(_i) {
        var start = _i,
            l;

        if (tokens[start].atrule_l !== undefined) return tokens[start].atrule_l;

        if (l = checkAtruler(_i)) tokens[_i].atrule_type = 1;
        else if (l = checkAtruleb(_i)) tokens[_i].atrule_type = 2;
        else if (l = checkAtrules(_i)) tokens[_i].atrule_type = 3;
        else return fail(tokens[start]);

        tokens[start].atrule_l = l;

        return l;
    }

    function getAtrule() {
        switch (tokens[pos].atrule_type) {
            case 1: return getAtruler();
            case 2: return getAtruleb();
            case 3: return getAtrules();
        }
    }

//atruleb = atkeyword:ak tset*:ap block:b -> this.concat([#atruleb, ak], ap, [b])
    function checkAtruleb(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkTsets(_i)) _i += l;

        if (l = checkBlock(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtruleb() {
        return (needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulebType, getAtkeyword()] :
                    [CSSPNodeType.AtrulebType, getAtkeyword()])
                        .concat(getTsets())
                        .concat([getBlock()]);
    }

//atruler = atkeyword:ak atrulerq:x '{' atrulers:y '}' -> [#atruler, ak, x, y]
    function checkAtruler(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkAtrulerq(_i)) _i += l;

        if (_i < tokens.length && tokens[_i].type === TokenType.LeftCurlyBracket) _i++;
        else return fail(tokens[_i]);

        if (l = checkAtrulers(_i)) _i += l;

        if (_i < tokens.length && tokens[_i].type === TokenType.RightCurlyBracket) _i++;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtruler() {
        var atruler = needInfo?
                        [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulerType, getAtkeyword(), getAtrulerq()] :
                        [CSSPNodeType.AtrulerType, getAtkeyword(), getAtrulerq()];

        pos++;

        atruler.push(getAtrulers());

        pos++;

        return atruler;
    }

//atrulerq = tset*:ap -> [#atrulerq].concat(ap)
    function checkAtrulerq(_i) {
        return checkTsets(_i);
    }

    function getAtrulerq() {
        return (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulerqType] : [CSSPNodeType.AtrulerqType]).concat(getTsets());
    }

//atrulers = sc*:s0 ruleset*:r sc*:s1 -> this.concat([#atrulers], s0, r, s1)
    function checkAtrulers(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        while ((l = checkRuleset(_i)) || (l = checkAtrule(_i)) || (l = checkSC(_i))) {
            _i += l;
        }

        tokens[_i].atrulers_end = 1;

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function getAtrulers() {
        var atrulers = (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulersType] : [CSSPNodeType.AtrulersType]).concat(getSC()),
            x;

        while (!tokens[pos].atrulers_end) {
            if (checkSC(pos)) {
                atrulers = atrulers.concat(getSC());
            } else if (checkRuleset(pos)) {
                atrulers.push(getRuleset());
            } else {
                atrulers.push(getAtrule());
            }
        }

        return atrulers.concat(getSC());
    }

//atrules = atkeyword:ak tset*:ap ';' -> this.concat([#atrules, ak], ap)
    function checkAtrules(_i) {
        var start = _i,
            l;

        if (l = checkAtkeyword(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkTsets(_i)) _i += l;

        if (_i >= tokens.length) return _i - start;

        if (tokens[_i].type === TokenType.Semicolon) _i++;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getAtrules() {
        var atrules = (needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.AtrulesType, getAtkeyword()] : [CSSPNodeType.AtrulesType, getAtkeyword()]).concat(getTsets());

        pos++;

        return atrules;
    }

//block = '{' blockdecl*:x '}' -> this.concatContent([#block], x)
    function checkBlock(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.LeftCurlyBracket) return tokens[_i].right - _i + 1;

        return fail(tokens[_i]);
    }

    function getBlock() {
        var block = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.BlockType] : [CSSPNodeType.BlockType],
            end = tokens[pos].right;

        pos++;

        while (pos < end) {
            if (checkBlockdecl(pos)) block = block.concat(getBlockdecl());
            else throwError();
        }

        pos = end + 1;

        return block;
    }

//blockdecl = sc*:s0 (filter | declaration):x decldelim:y sc*:s1 -> this.concat(s0, [x], [y], s1)
//          | sc*:s0 (filter | declaration):x sc*:s1 -> this.concat(s0, [x], s1)
//          | sc*:s0 decldelim:x sc*:s1 -> this.concat(s0, [x], s1)
//          | sc+:s0 -> s0

    function checkBlockdecl(_i) {
        var l;

        if (l = _checkBlockdecl0(_i)) tokens[_i].bd_type = 1;
        else if (l = _checkBlockdecl1(_i)) tokens[_i].bd_type = 2;
        else if (l = _checkBlockdecl2(_i)) tokens[_i].bd_type = 3;
        else if (l = _checkBlockdecl3(_i)) tokens[_i].bd_type = 4;
        else return fail(tokens[_i]);

        return l;
    }

    function getBlockdecl() {
        switch (tokens[pos].bd_type) {
            case 1: return _getBlockdecl0();
            case 2: return _getBlockdecl1();
            case 3: return _getBlockdecl2();
            case 4: return _getBlockdecl3();
        }
    }

    //sc*:s0 (filter | declaration):x decldelim:y sc*:s1 -> this.concat(s0, [x], [y], s1)
    function _checkBlockdecl0(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkFilter(_i)) {
            tokens[_i].bd_filter = 1;
            _i += l;
        } else if (l = checkDeclaration(_i)) {
            tokens[_i].bd_decl = 1;
            _i += l;
        } else return fail(tokens[_i]);

        if (_i < tokens.length && (l = checkDecldelim(_i))) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl0() {
        return getSC()
                .concat([tokens[pos].bd_filter? getFilter() : getDeclaration()])
                .concat([getDecldelim()])
                .concat(getSC());
    }

    //sc*:s0 (filter | declaration):x sc*:s1 -> this.concat(s0, [x], s1)
    function _checkBlockdecl1(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkFilter(_i)) {
            tokens[_i].bd_filter = 1;
            _i += l;
        } else if (l = checkDeclaration(_i)) {
            tokens[_i].bd_decl = 1;
            _i += l;
        } else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl1() {
        return getSC()
                .concat([tokens[pos].bd_filter? getFilter() : getDeclaration()])
                .concat(getSC());
    }

    //sc*:s0 decldelim:x sc*:s1 -> this.concat(s0, [x], s1)
    function _checkBlockdecl2(_i) {
        var start = _i,
            l;

        if (l = checkSC(_i)) _i += l;

        if (l = checkDecldelim(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function _getBlockdecl2() {
        return getSC()
                 .concat([getDecldelim()])
                 .concat(getSC());
    }

    //sc+:s0 -> s0
    function _checkBlockdecl3(_i) {
        return checkSC(_i);
    }

    function _getBlockdecl3() {
        return getSC();
    }

//braces = '(' tset*:x ')' -> this.concat([#braces, '(', ')'], x)
//       | '[' tset*:x ']' -> this.concat([#braces, '[', ']'], x)
    function checkBraces(_i) {
        if (_i >= tokens.length ||
            (tokens[_i].type !== TokenType.LeftParenthesis &&
             tokens[_i].type !== TokenType.LeftSquareBracket)
            ) return fail(tokens[_i]);

        return tokens[_i].right - _i + 1;
    }

    function getBraces() {
        var startPos = pos,
            left = pos,
            right = tokens[pos].right;

        pos++;

        var tsets = getTsets();

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.BracesType, tokens[left].value, tokens[right].value].concat(tsets) :
                [CSSPNodeType.BracesType, tokens[left].value, tokens[right].value].concat(tsets);
    }

    function checkCDC(_i) {}

    function checkCDO(_i) {}

    // node: Clazz
    function checkClazz(_i) {
        var l;

        if (tokens[_i].clazz_l) return tokens[_i].clazz_l;

        if (tokens[_i].type === TokenType.FullStop) {
            if (l = checkIdent(_i + 1)) {
                tokens[_i].clazz_l = l + 1;
                return l + 1;
            }
        }

        return fail(tokens[_i]);
    }

    function getClazz() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.ClazzType, getIdent()] :
                [CSSPNodeType.ClazzType, getIdent()];
    }

    // node: Combinator
    function checkCombinator(_i) {
        if (tokens[_i].type === TokenType.PlusSign ||
            tokens[_i].type === TokenType.GreaterThanSign ||
            tokens[_i].type === TokenType.Tilde) return 1;

        return fail(tokens[_i]);
    }

    function getCombinator() {
        return needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.CombinatorType, tokens[pos++].value] :
                [CSSPNodeType.CombinatorType, tokens[pos++].value];
    }

    // node: Comment
    function checkComment(_i) {
        if (tokens[_i].type === TokenType.CommentML) return 1;

        return fail(tokens[_i]);
    }

    function getComment() {
        var startPos = pos,
            s = tokens[pos].value.substring(2),
            l = s.length;

        if (s.charAt(l - 2) === '*' && s.charAt(l - 1) === '/') s = s.substring(0, l - 2);

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.CommentType, s] :
                [CSSPNodeType.CommentType, s];
    }

    // declaration = property:x ':' value:y -> [#declaration, x, y]
    function checkDeclaration(_i) {
        var start = _i,
            l;

        if (l = checkProperty(_i)) _i += l;
        else return fail(tokens[_i]);

        if (_i < tokens.length && tokens[_i].type === TokenType.Colon) _i++;
        else return fail(tokens[_i]);

        if (l = checkValue(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getDeclaration() {
        var declaration = needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.DeclarationType, getProperty()] :
                [CSSPNodeType.DeclarationType, getProperty()];

        pos++;

        declaration.push(getValue());

        return declaration;
    }

    // node: Decldelim
    function checkDecldelim(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.Semicolon) return 1;

        return fail(tokens[_i]);
    }

    function getDecldelim() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DecldelimType] :
                [CSSPNodeType.DecldelimType];
    }

    // node: Delim
    function checkDelim(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.Comma) return 1;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function getDelim() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DelimType] :
                [CSSPNodeType.DelimType];
    }

    // node: Dimension
    function checkDimension(_i) {
        var ln = checkNumber(_i),
            li;

        if (!ln || (ln && _i + ln >= tokens.length)) return fail(tokens[_i]);

        if (li = checkNmName2(_i + ln)) return ln + li;

        return fail(tokens[_i]);
    }

    function getDimension() {
        var startPos = pos,
            n = getNumber(),
            dimension = needInfo ?
                [{ ln: tokens[pos].ln }, CSSPNodeType.IdentType, getNmName2()] :
                [CSSPNodeType.IdentType, getNmName2()];

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.DimensionType, n, dimension] :
                [CSSPNodeType.DimensionType, n, dimension];
    }

//filter = filterp:x ':' filterv:y -> [#filter, x, y]
    function checkFilter(_i) {
        var start = _i,
            l;

        if (l = checkFilterp(_i)) _i += l;
        else return fail(tokens[_i]);

        if (tokens[_i].type === TokenType.Colon) _i++;
        else return fail(tokens[_i]);

        if (l = checkFilterv(_i)) _i += l;
        else return fail(tokens[_i]);

        return _i - start;
    }

    function getFilter() {
        var filter = needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.FilterType, getFilterp()] :
                [CSSPNodeType.FilterType, getFilterp()];

        pos++;

        filter.push(getFilterv());

        return filter;
    }

//filterp = (seq('-filter') | seq('_filter') | seq('*filter') | seq('-ms-filter') | seq('filter')):t sc*:s0 -> this.concat([#property, [#ident, t]], s0)
    function checkFilterp(_i) {
        var start = _i,
            l,
            x;

        if (_i < tokens.length) {
            if (tokens[_i].value === 'filter') l = 1;
            else {
                x = joinValues2(_i, 2);

                if (x === '-filter' || x === '_filter' || x === '*filter') l = 2;
                else {
                    x = joinValues2(_i, 4);

                    if (x === '-ms-filter') l = 4;
                    else return fail(tokens[_i]);
                }
            }

            tokens[start].filterp_l = l;

            _i += l;

            if (checkSC(_i)) _i += l;

            return _i - start;
        }

        return fail(tokens[_i]);
    }

    function getFilterp() {
        var startPos = pos,
            x = joinValues2(pos, tokens[pos].filterp_l),
            ident = needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.IdentType, x] : [CSSPNodeType.IdentType, x];

        pos += tokens[pos].filterp_l;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.PropertyType, ident] : [CSSPNodeType.PropertyType, ident])
                    .concat(getSC());

    }

//filterv = progid+:x -> [#filterv].concat(x)
    function checkFilterv(_i) {
        var start = _i,
            l;

        if (l = checkProgid(_i)) _i += l;
        else return fail(tokens[_i]);

        while (l = checkProgid(_i)) {
            _i += l;
        }

        tokens[start].last_progid = _i;

        if (_i < tokens.length && (l = checkSC(_i))) _i += l;

        if (_i < tokens.length && (l = checkImportant(_i))) _i += l;

        return _i - start;
    }

    function getFilterv() {
        var filterv = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.FiltervType] : [CSSPNodeType.FiltervType],
            last_progid = tokens[pos].last_progid;

        while (pos < last_progid) {
            filterv.push(getProgid());
        }

        filterv = filterv.concat(checkSC(pos) ? getSC() : []);

        if (pos < tokens.length && checkImportant(pos)) filterv.push(getImportant());

        return filterv;
    }

//functionExpression = ``expression('' functionExpressionBody*:x ')' -> [#functionExpression, x.join('')],
    function checkFunctionExpression(_i) {
        var start = _i;

        if (!tokens[_i] || tokens[_i++].value !== 'expression') return fail(tokens[_i - 1]);

        if (!tokens[_i] || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i]);

        return tokens[_i].right - start + 1;
    }

    function getFunctionExpression() {
        var startPos = pos;

        pos++;

        var e = joinValues(pos + 1, tokens[pos].right - 1);

        pos = tokens[pos].right + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionExpressionType, e] :
                [CSSPNodeType.FunctionExpressionType, e];
    }

//funktion = ident:x '(' functionBody:y ')' -> [#funktion, x, y]
    function checkFunktion(_i) {
        var start = _i,
            l = checkIdent(_i);

        if (!l) return fail(tokens[_i]);

        _i += l;

        if (_i >= tokens.length || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i - 1]);

        return tokens[_i].right - start + 1;
    }

    function getFunktion() {
        var startPos = pos,
            ident = getIdent();

        pos++;

        var body = ident[needInfo? 2 : 1] !== 'not'?
            getFunctionBody() :
            getNotFunctionBody(); // ok, here we have CSS3 initial draft: http://dev.w3.org/csswg/selectors3/#negation

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.FunktionType, ident, body] :
                [CSSPNodeType.FunktionType, ident, body];
    }

    function getFunctionBody() {
        var startPos = pos,
            body = [],
            x;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkTset(pos)) {
                x = getTset();
                if ((needInfo && typeof x[1] === 'string') || typeof x[0] === 'string') body.push(x);
                else body = body.concat(x);
            } else if (checkClazz(pos)) {
                body.push(getClazz());
            } else {
                throwError();
            }
        }

        pos++;

        return (needInfo?
                    [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionBodyType] :
                    [CSSPNodeType.FunctionBodyType]
                ).concat(body);
    }

    function getNotFunctionBody() {
        var startPos = pos,
            body = [],
            x;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSimpleselector(pos)) {
                body.push(getSimpleSelector());
            } else {
                throwError();
            }
        }

        pos++;

        return (needInfo?
                    [{ ln: tokens[startPos].ln }, CSSPNodeType.FunctionBodyType] :
                    [CSSPNodeType.FunctionBodyType]
                ).concat(body);
    }

    // node: Ident
    function checkIdent(_i) {
        if (_i >= tokens.length) return fail(tokens[_i]);

        var start = _i,
            wasIdent = false;

        if (tokens[_i].type === TokenType.LowLine) return checkIdentLowLine(_i);

        // start char / word
        if (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.Identifier ||
            tokens[_i].type === TokenType.DollarSign ||
            tokens[_i].type === TokenType.Asterisk) _i++;
        else return fail(tokens[_i]);

        wasIdent = tokens[_i - 1].type === TokenType.Identifier;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.LowLine) {
                    if (tokens[_i].type !== TokenType.Identifier &&
                        (tokens[_i].type !== TokenType.DecimalNumber || !wasIdent)
                        ) break;
                    else wasIdent = true;
            }   
        }

        if (!wasIdent && tokens[start].type !== TokenType.Asterisk) return fail(tokens[_i]);

        tokens[start].ident_last = _i - 1;

        return _i - start;
    }

    function checkIdentLowLine(_i) {
        var start = _i;

        _i++;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.DecimalNumber &&
                tokens[_i].type !== TokenType.LowLine &&
                tokens[_i].type !== TokenType.Identifier) break;
        }

        tokens[start].ident_last = _i - 1;

        return _i - start;
    }

    function getIdent() {
        var startPos = pos,
            s = joinValues(pos, tokens[pos].ident_last);

        pos = tokens[pos].ident_last + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.IdentType, s] :
                [CSSPNodeType.IdentType, s];
    }

//important = '!' sc*:s0 seq('important') -> [#important].concat(s0)
    function checkImportant(_i) {
        var start = _i,
            l;

        if (tokens[_i++].type !== TokenType.ExclamationMark) return fail(tokens[_i - 1]);

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].value !== 'important') return fail(tokens[_i]);

        return _i - start + 1;
    }

    function getImportant() {
        var startPos = pos;

        pos++;

        var sc = getSC();

        pos++;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.ImportantType] : [CSSPNodeType.ImportantType]).concat(sc);
    }

    // node: Namespace
    function checkNamespace(_i) {
        if (tokens[_i].type === TokenType.VerticalLine) return 1;

        return fail(tokens[_i]);
    }

    function getNamespace() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NamespaceType] :
                [CSSPNodeType.NamespaceType];
    }

//nth = (digit | 'n')+:x -> [#nth, x.join('')]
//    | (seq('even') | seq('odd')):x -> [#nth, x]
    function checkNth(_i) {
        return checkNth1(_i) || checkNth2(_i);
    }

    function checkNth1(_i) {
        var start = _i;

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.DecimalNumber && tokens[_i].value !== 'n') break;
        }

        if (_i !== start) {
            tokens[start].nth_last = _i - 1;
            return _i - start;
        }

        return fail(tokens[_i]);
    }

    function getNth() {
        var startPos = pos;

        if (tokens[pos].nth_last) {
            var n = needInfo?
                        [{ ln: tokens[startPos].ln }, CSSPNodeType.NthType, joinValues(pos, tokens[pos].nth_last)] :
                        [CSSPNodeType.NthType, joinValues(pos, tokens[pos].nth_last)];

            pos = tokens[pos].nth_last + 1;

            return n;
        }

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NthType, tokens[pos++].value] :
                [CSSPNodeType.NthType, tokens[pos++].value];
    }

    function checkNth2(_i) {
        if (tokens[_i].value === 'even' || tokens[_i].value === 'odd') return 1;

        return fail(tokens[_i]);
    }

//nthf = ':' seq('nth-'):x (seq('child') | seq('last-child') | seq('of-type') | seq('last-of-type')):y -> (x + y)
    function checkNthf(_i) {
        var start = _i,
            l = 0;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]); l++;

        if (tokens[_i++].value !== 'nth' || tokens[_i++].value !== '-') return fail(tokens[_i - 1]); l += 2;

        if ('child' === tokens[_i].value) {
            l += 1;
        } else if ('last-child' === tokens[_i].value +
                                    tokens[_i + 1].value +
                                    tokens[_i + 2].value) {
            l += 3;
        } else if ('of-type' === tokens[_i].value +
                                 tokens[_i + 1].value +
                                 tokens[_i + 2].value) {
            l += 3;
        } else if ('last-of-type' === tokens[_i].value +
                                      tokens[_i + 1].value +
                                      tokens[_i + 2].value +
                                      tokens[_i + 3].value +
                                      tokens[_i + 4].value) {
            l += 5;
        } else return fail(tokens[_i]);

        tokens[start + 1].nthf_last = start + l - 1;

        return l;
    }

    function getNthf() {
        pos++;

        var s = joinValues(pos, tokens[pos].nthf_last);

        pos = tokens[pos].nthf_last + 1;

        return s;
    }

//nthselector = nthf:x '(' (sc | unary | nth)*:y ')' -> [#nthselector, [#ident, x]].concat(y)
    function checkNthselector(_i) {
        var start = _i,
            l;

        if (l = checkNthf(_i)) _i += l;
        else return fail(tokens[_i]);

        if (tokens[_i].type !== TokenType.LeftParenthesis || !tokens[_i].right) return fail(tokens[_i]);

        l++;

        var rp = tokens[_i++].right;

        while (_i < rp) {
            if (l = checkSC(_i)) _i += l;
            else if (l = checkUnary(_i)) _i += l;
            else if (l = checkNth(_i)) _i += l;
            else return fail(tokens[_i]);
        }

        return rp - start + 1;
    }

    function getNthselector() {
        var startPos = pos,
            nthf = needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.IdentType, getNthf()] :
                    [CSSPNodeType.IdentType, getNthf()],
            ns = needInfo?
                    [{ ln: tokens[pos].ln }, CSSPNodeType.NthselectorType, nthf] :
                    [CSSPNodeType.NthselectorType, nthf];

        pos++;

        while (tokens[pos].type !== TokenType.RightParenthesis) {
            if (checkSC(pos)) ns = ns.concat(getSC());
            else if (checkUnary(pos)) ns.push(getUnary());
            else if (checkNth(pos)) ns.push(getNth());
        }

        pos++;

        return ns;
    }

    // node: Number
    function checkNumber(_i) {
        if (_i < tokens.length && tokens[_i].number_l) return tokens[_i].number_l;

        if (_i < tokens.length && tokens[_i].type === TokenType.DecimalNumber &&
            (!tokens[_i + 1] ||
             (tokens[_i + 1] && tokens[_i + 1].type !== TokenType.FullStop))
        ) return (tokens[_i].number_l = 1, tokens[_i].number_l); // 10

        if (_i < tokens.length &&
             tokens[_i].type === TokenType.DecimalNumber &&
             tokens[_i + 1] && tokens[_i + 1].type === TokenType.FullStop &&
             (!tokens[_i + 2] || (tokens[_i + 2].type !== TokenType.DecimalNumber))
        ) return (tokens[_i].number_l = 2, tokens[_i].number_l); // 10.

        if (_i < tokens.length &&
            tokens[_i].type === TokenType.FullStop &&
            tokens[_i + 1].type === TokenType.DecimalNumber
        ) return (tokens[_i].number_l = 2, tokens[_i].number_l); // .10

        if (_i < tokens.length &&
            tokens[_i].type === TokenType.DecimalNumber &&
            tokens[_i + 1] && tokens[_i + 1].type === TokenType.FullStop &&
            tokens[_i + 2] && tokens[_i + 2].type === TokenType.DecimalNumber
        ) return (tokens[_i].number_l = 3, tokens[_i].number_l); // 10.10

        return fail(tokens[_i]);
    }

    function getNumber() {
        var s = '',
            startPos = pos,
            l = tokens[pos].number_l;

        for (var i = 0; i < l; i++) {
            s += tokens[pos + i].value;
        }

        pos += l;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.NumberType, s] :
                [CSSPNodeType.NumberType, s];
    }

    // node: Operator
    function checkOperator(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.Solidus ||
            tokens[_i].type === TokenType.Comma ||
            tokens[_i].type === TokenType.Colon ||
            tokens[_i].type === TokenType.EqualsSign)) return 1;

        return fail(tokens[_i]);
    }

    function getOperator() {
        return needInfo?
                [{ ln: tokens[pos].ln }, CSSPNodeType.OperatorType, tokens[pos++].value] :
                [CSSPNodeType.OperatorType, tokens[pos++].value];
    }

    // node: Percentage
    function checkPercentage(_i) {
        var x = checkNumber(_i);

        if (!x || (x && _i + x >= tokens.length)) return fail(tokens[_i]);

        if (tokens[_i + x].type === TokenType.PercentSign) return x + 1;

        return fail(tokens[_i]);
    }

    function getPercentage() {
        var startPos = pos,
            n = getNumber();

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PercentageType, n] :
                [CSSPNodeType.PercentageType, n];
    }

//progid = sc*:s0 seq('progid:DXImageTransform.Microsoft.'):x letter+:y '(' (m_string | m_comment | ~')' char)+:z ')' sc*:s1
//                -> this.concat([#progid], s0, [[#raw, x + y.join('') + '(' + z.join('') + ')']], s1),
    function checkProgid(_i) {
        var start = _i,
            l,
            x;

        if (l = checkSC(_i)) _i += l;

        if ((x = joinValues2(_i, 6)) === 'progid:DXImageTransform.Microsoft.') {
            _start = _i;
            _i += 6;
        } else return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        if (tokens[_i].type === TokenType.LeftParenthesis) {
            tokens[start].progid_end = tokens[_i].right;
            _i = tokens[_i].right + 1;
        } else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    function getProgid() {
        var startPos = pos,
            progid_end = tokens[pos].progid_end;

        return (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.ProgidType] : [CSSPNodeType.ProgidType])
                .concat(getSC())
                .concat([_getProgid(progid_end)])
                .concat(getSC());
    }

    function _getProgid(progid_end) {
        var startPos = pos,
            x = joinValues(pos, progid_end);

        pos = progid_end + 1;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.RawType, x] :
                [CSSPNodeType.RawType, x];
    }

//property = ident:x sc*:s0 -> this.concat([#property, x], s0)
    function checkProperty(_i) {
        var start = _i,
            l;

        if (l = checkIdent(_i)) _i += l;
        else return fail(tokens[_i]);

        if (l = checkSC(_i)) _i += l;
        return _i - start;
    }

    function getProperty() {
        var startPos = pos;

        return (needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PropertyType, getIdent()] :
                [CSSPNodeType.PropertyType, getIdent()])
            .concat(getSC());
    }

    function checkPseudo(_i) {
        return checkPseudoe(_i) ||
               checkPseudoc(_i);
    }

    function getPseudo() {
        if (checkPseudoe(pos)) return getPseudoe();
        if (checkPseudoc(pos)) return getPseudoc();
    }

    function checkPseudoe(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if (l = checkIdent(_i)) return l + 2;

        return fail(tokens[_i]);
    }

    function getPseudoe() {
        var startPos = pos;

        pos += 2;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PseudoeType, getIdent()] :
                [CSSPNodeType.PseudoeType, getIdent()];
    }

//pseudoc = ':' (funktion | ident):x -> [#pseudoc, x]
    function checkPseudoc(_i) {
        var l;

        if (tokens[_i++].type !== TokenType.Colon) return fail(tokens[_i - 1]);

        if ((l = checkFunktion(_i)) || (l = checkIdent(_i))) return l + 1;

        return fail(tokens[_i]);
    }

    function getPseudoc() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.PseudocType, checkFunktion(pos)? getFunktion() : getIdent()] :
                [CSSPNodeType.PseudocType, checkFunktion(pos)? getFunktion() : getIdent()];
    }

    //ruleset = selector*:x block:y -> this.concat([#ruleset], x, [y])
    function checkRuleset(_i) {
        var start = _i,
            l;

        if (tokens[start].ruleset_l !== undefined) return tokens[start].ruleset_l;

        while (l = checkSelector(_i)) {
            _i += l;
        }

        if (l = checkBlock(_i)) _i += l;
        else return fail(tokens[_i]);

        tokens[start].ruleset_l = _i - start;

        return _i - start;
    }

    function getRuleset() {
        var ruleset = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.RulesetType] : [CSSPNodeType.RulesetType];

        while (!checkBlock(pos)) {
            ruleset.push(getSelector());
        }

        ruleset.push(getBlock());

        return ruleset;
    }

    // node: S
    function checkS(_i) {
        if (tokens[_i].ws) return tokens[_i].ws_last - _i + 1;

        return fail(tokens[_i]);
    }

    function getS() {
        var startPos = pos,
            s = joinValues(pos, tokens[pos].ws_last);

        pos = tokens[pos].ws_last + 1;

        return needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.SType, s] : [CSSPNodeType.SType, s];
    }

    function checkSC(_i) {
        var l,
            lsc = 0;

        while (_i < tokens.length) {
            if (!(l = checkS(_i)) && !(l = checkComment(_i))) break;
            _i += l;
            lsc += l;
        }

        if (lsc) return lsc;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function getSC() {
        var sc = [];

        while (pos < tokens.length) {
            if (checkS(pos)) sc.push(getS());
            else if (checkComment(pos)) sc.push(getComment());
            else break;
        }

        return sc;
    }

    //selector = (simpleselector | delim)+:x -> this.concat([#selector], x)
    function checkSelector(_i) {
        var start = _i,
            l;

        if (_i < tokens.length) {
            while (l = checkSimpleselector(_i) || checkDelim(_i)) {
                _i += l;
            }

            tokens[start].selector_end = _i - 1;

            return _i - start;
        }
    }

    function getSelector() {
        var selector = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.SelectorType] : [CSSPNodeType.SelectorType],
            selector_end = tokens[pos].selector_end;

        while (pos <= selector_end) {
            selector.push(checkDelim(pos) ? getDelim() : getSimpleSelector());
        }

        return selector;
    }

    // node: Shash
    function checkShash(_i) {
        if (tokens[_i].type !== TokenType.NumberSign) return fail(tokens[_i]);

        var l = checkNmName(_i + 1);

        if (l) return l + 1;

        return fail(tokens[_i]);
    }

    function getShash() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.ShashType, getNmName()] :
                [CSSPNodeType.ShashType, getNmName()];
    }

//simpleselector = (nthselector | combinator | attrib | pseudo | clazz | shash | any | sc | namespace)+:x -> this.concatContent([#simpleselector], [x])
    function checkSimpleselector(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = _checkSimpleSelector(_i)) _i += l;
            else break;
        }

        if (_i - start) return _i - start;

        if (_i >= tokens.length) return fail(tokens[tokens.length - 1]);

        return fail(tokens[_i]);
    }

    function _checkSimpleSelector(_i) {
        return checkNthselector(_i) ||
               checkCombinator(_i) ||
               checkAttrib(_i) ||
               checkPseudo(_i) ||
               checkClazz(_i) ||
               checkShash(_i) ||
               checkAny(_i) ||
               checkSC(_i) ||
               checkNamespace(_i);
    }

    function getSimpleSelector() {
        var ss = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.SimpleselectorType] : [CSSPNodeType.SimpleselectorType],
            t;

        while (pos < tokens.length && _checkSimpleSelector(pos)) {
            t = _getSimpleSelector();

            if ((needInfo && typeof t[1] === 'string') || typeof t[0] === 'string') ss.push(t);
            else ss = ss.concat(t);
        }

        return ss;
    }

    function _getSimpleSelector() {
        if (checkNthselector(pos)) return getNthselector();
        else if (checkCombinator(pos)) return getCombinator();
        else if (checkAttrib(pos)) return getAttrib();
        else if (checkPseudo(pos)) return getPseudo();
        else if (checkClazz(pos)) return getClazz();
        else if (checkShash(pos)) return getShash();
        else if (checkAny(pos)) return getAny();
        else if (checkSC(pos)) return getSC();
        else if (checkNamespace(pos)) return getNamespace();
    }

    // node: String
    function checkString(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.StringSQ || tokens[_i].type === TokenType.StringDQ)
        ) return 1;

        return fail(tokens[_i]);
    }

    function getString() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.StringType, tokens[pos++].value] :
                [CSSPNodeType.StringType, tokens[pos++].value];
    }

    //stylesheet = (cdo | cdc | sc | statement)*:x -> this.concat([#stylesheet], x)
    function checkStylesheet(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = checkSC(_i)) _i += l;
            else {
                currentBlockLN = tokens[_i].ln;
                if (l = checkAtrule(_i)) _i += l;
                else if (l = checkRuleset(_i)) _i += l;
                else if (l = checkUnknown(_i)) _i += l;
                else throwError();
            }
        }

        return _i - start;
    }

    function getStylesheet(_i) {
        var t,
            stylesheet = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.StylesheetType] : [CSSPNodeType.StylesheetType];

        while (pos < tokens.length) {
            if (checkSC(pos)) stylesheet = stylesheet.concat(getSC());
            else {
                currentBlockLN = tokens[pos].ln;
                if (checkRuleset(pos)) stylesheet.push(getRuleset());
                else if (checkAtrule(pos)) stylesheet.push(getAtrule());
                else if (checkUnknown(pos)) stylesheet.push(getUnknown());
                else throwError();
            }
        }

        return stylesheet;
    }

//tset = vhash | any | sc | operator
    function checkTset(_i) {
        return checkVhash(_i) ||
               checkAny(_i) ||
               checkSC(_i) ||
               checkOperator(_i);
    }

    function getTset() {
        if (checkVhash(pos)) return getVhash();
        else if (checkAny(pos)) return getAny();
        else if (checkSC(pos)) return getSC();
        else if (checkOperator(pos)) return getOperator();
    }

    function checkTsets(_i) {
        var start = _i,
            l;

        while (l = checkTset(_i)) {
            _i += l;
        }

        return _i - start;
    }

    function getTsets() {
        var tsets = [],
            x;

        while (x = getTset()) {
            if ((needInfo && typeof x[1] === 'string') || typeof x[0] === 'string') tsets.push(x);
            else tsets = tsets.concat(x);
        }

        return tsets;
    }

    // node: Unary
    function checkUnary(_i) {
        if (_i < tokens.length &&
            (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.PlusSign)
        ) return 1;

        return fail(tokens[_i]);
    }

    function getUnary() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.UnaryType, tokens[pos++].value] :
                [CSSPNodeType.UnaryType, tokens[pos++].value];
    }

    // node: Unknown
    function checkUnknown(_i) {
        if (_i < tokens.length && tokens[_i].type === TokenType.CommentSL) return 1;

        return fail(tokens[_i]);
    }

    function getUnknown() {
        var startPos = pos;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.UnknownType, tokens[pos++].value] :
                [CSSPNodeType.UnknownType, tokens[pos++].value];
    }

//    uri = seq('url(') sc*:s0 string:x sc*:s1 ')' -> this.concat([#uri], s0, [x], s1)
//        | seq('url(') sc*:s0 (~')' ~m_w char)*:x sc*:s1 ')' -> this.concat([#uri], s0, [[#raw, x.join('')]], s1),
    function checkUri(_i) {
        var start = _i,
            l;

        if (_i < tokens.length && tokens[_i++].value !== 'url') return fail(tokens[_i - 1]);

        if (!tokens[_i] || tokens[_i].type !== TokenType.LeftParenthesis) return fail(tokens[_i]);

        return tokens[_i].right - start + 1;
    }

    function getUri() {
        var startPos = pos,
            uriExcluding = {};

        pos += 2;

        uriExcluding[TokenType.Space] = 1;
        uriExcluding[TokenType.Tab] = 1;
        uriExcluding[TokenType.Newline] = 1;
        uriExcluding[TokenType.LeftParenthesis] = 1;
        uriExcluding[TokenType.RightParenthesis] = 1;

        if (checkUri1(pos)) {
            var uri = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.UriType] : [CSSPNodeType.UriType])
                        .concat(getSC())
                        .concat([getString()])
                        .concat(getSC());

            pos++;

            return uri;
        } else {
            var uri = (needInfo? [{ ln: tokens[startPos].ln }, CSSPNodeType.UriType] : [CSSPNodeType.UriType])
                        .concat(getSC()),
                l = checkExcluding(uriExcluding, pos),
                raw = needInfo?
                        [{ ln: tokens[pos].ln }, CSSPNodeType.RawType, joinValues(pos, pos + l)] :
                        [CSSPNodeType.RawType, joinValues(pos, pos + l)];

            uri.push(raw);

            pos += l + 1;

            uri = uri.concat(getSC());

            pos++;

            return uri;
        }
    }

    function checkUri1(_i) {
        var start = _i,
            l = checkSC(_i);

        if (l) _i += l;

        if (tokens[_i].type !== TokenType.StringDQ && tokens[_i].type !== TokenType.StringSQ) return fail(tokens[_i]);

        _i++;

        if (l = checkSC(_i)) _i += l;

        return _i - start;
    }

    // value = (sc | vhash | any | block | atkeyword | operator | important)+:x -> this.concat([#value], x)
    function checkValue(_i) {
        var start = _i,
            l;

        while (_i < tokens.length) {
            if (l = _checkValue(_i)) _i += l;
            else break;
        }

        if (_i - start) return _i - start;

        return fail(tokens[_i]);
    }

    function _checkValue(_i) {
        return checkSC(_i) ||
               checkVhash(_i) ||
               checkAny(_i) ||
               checkBlock(_i) ||
               checkAtkeyword(_i) ||
               checkOperator(_i) ||
               checkImportant(_i);
    }

    function getValue() {
        var ss = needInfo? [{ ln: tokens[pos].ln }, CSSPNodeType.ValueType] : [CSSPNodeType.ValueType],
            t;

        while (pos < tokens.length && _checkValue(pos)) {
            t = _getValue();

            if ((needInfo && typeof t[1] === 'string') || typeof t[0] === 'string') ss.push(t);
            else ss = ss.concat(t);
        }

        return ss;
    }

    function _getValue() {
        if (checkSC(pos)) return getSC();
        else if (checkVhash(pos)) return getVhash();
        else if (checkAny(pos)) return getAny();
        else if (checkBlock(pos)) return getBlock();
        else if (checkAtkeyword(pos)) return getAtkeyword();
        else if (checkOperator(pos)) return getOperator();
        else if (checkImportant(pos)) return getImportant();
    }

    // node: Vhash
    function checkVhash(_i) {
        if (_i >= tokens.length || tokens[_i].type !== TokenType.NumberSign) return fail(tokens[_i]);

        var l = checkNmName2(_i + 1);

        if (l) return l + 1;

        return fail(tokens[_i]);
    }

    function getVhash() {
        var startPos = pos;

        pos++;

        return needInfo?
                [{ ln: tokens[startPos].ln }, CSSPNodeType.VhashType, getNmName2()] :
                [CSSPNodeType.VhashType, getNmName2()];
    }

    function checkNmName(_i) {
        var start = _i;

        // start char / word
        if (tokens[_i].type === TokenType.HyphenMinus ||
            tokens[_i].type === TokenType.LowLine ||
            tokens[_i].type === TokenType.Identifier ||
            tokens[_i].type === TokenType.DecimalNumber) _i++;
        else return fail(tokens[_i]);

        for (; _i < tokens.length; _i++) {
            if (tokens[_i].type !== TokenType.HyphenMinus &&
                tokens[_i].type !== TokenType.LowLine &&
                tokens[_i].type !== TokenType.Identifier &&
                tokens[_i].type !== TokenType.DecimalNumber) break;
        }

        tokens[start].nm_name_last = _i - 1;

        return _i - start;
    }

    function getNmName() {
        var s = joinValues(pos, tokens[pos].nm_name_last);

        pos = tokens[pos].nm_name_last + 1;

        return s;
    }

    function checkNmName2(_i) {
        var start = _i;

        if (tokens[_i].type === TokenType.Identifier) return 1;
        else if (tokens[_i].type !== TokenType.DecimalNumber) return fail(tokens[_i]);

        _i++;

        if (!tokens[_i] || tokens[_i].type !== TokenType.Identifier) return 1;

        return 2;
    }

    function getNmName2() {
        var s = tokens[pos].value;

        if (tokens[pos++].type === TokenType.DecimalNumber &&
                pos < tokens.length &&
                tokens[pos].type === TokenType.Identifier
        ) s += tokens[pos++].value;

        return s;
    }

    function checkExcluding(exclude, _i) {
        var start = _i;

        while(_i < tokens.length) {
            if (exclude[tokens[_i++].type]) break;
        }

        return _i - start - 2;
    }

    function joinValues(start, finish) {
        var s = '';

        for (var i = start; i < finish + 1; i++) {
            s += tokens[i].value;
        }

        return s;
    }

    function joinValues2(start, num) {
        if (start + num - 1 >= tokens.length) return;

        var s = '';

        for (var i = 0; i < num; i++) {
            s += tokens[start + i].value;
        }

        return s;
    }

    function markSC() {
        var ws = -1, // whitespaces
            sc = -1, // ws and comments
            t;

        for (var i = 0; i < tokens.length; i++) {
            t = tokens[i];
            switch (t.type) {
                case TokenType.Space:
                case TokenType.Tab:
                case TokenType.Newline:
                    t.ws = true;
                    t.sc = true;

                    if (ws === -1) ws = i;
                    if (sc === -1) sc = i;

                    break;
                case TokenType.CommentML:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    t.sc = true;

                    break;
                default:
                    if (ws !== -1) {
                        tokens[ws].ws_last = i - 1;
                        ws = -1;
                    }

                    if (sc !== -1) {
                        tokens[sc].sc_last = i - 1;
                        sc = -1;
                    }
            }
        }

        if (ws !== -1) tokens[ws].ws_last = i - 1;
        if (sc !== -1) tokens[sc].sc_last = i - 1;
    }

    return function(_tokens, rule, _needInfo) {
        return _getAST(_tokens, rule, _needInfo);
    }

}());
    return function(s, rule, _needInfo) {
        return getCSSPAST(getTokens(s), rule, _needInfo);
    }
}());
exports.srcToCSSP = srcToCSSP;

},{}],28:[function(require,module,exports){
// CSSP

exports.srcToCSSP = require('./gonzales.cssp.node.js').srcToCSSP;

exports.csspToSrc = require('./cssp.translator.node.js').csspToSrc;

exports.csspToTree = function(tree, level) {
    var spaces = dummySpaces(level),
        level = level ? level : 0,
        s = (level ? '\n' + spaces : '') + '[';

    tree.forEach(function(e) {
        if (e.ln === undefined) {
            s += (Array.isArray(e) ? exports.csspToTree(e, level + 1) : ('\'' + e.toString() + '\'')) + ', ';
        }
    });

    return s.substr(0, s.length - 2) + ']';
}

function dummySpaces(num) {
    return '                                                  '.substr(0, num * 2);
}

},{"./cssp.translator.node.js":26,"./gonzales.cssp.node.js":27}]},{},[1]);
