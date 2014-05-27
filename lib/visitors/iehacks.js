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
    var map = this.hacksMap;
    hacks.forEach(function(h) {
      map[h] = 1;
    });
    return this;
  }

};
