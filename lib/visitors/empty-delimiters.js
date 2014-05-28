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
