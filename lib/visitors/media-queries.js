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
