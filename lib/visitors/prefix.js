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
  },
  
};
