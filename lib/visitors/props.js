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
