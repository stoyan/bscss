This tool generates browser-specific CSS, stripping unsupported features.

To figure out what's supported and what isn't, the tool uses input from:
 - caniuse.com
 - css-props library
 - random observations and heuristics

Nice list, but these are all currently todos. The only two supported features are:
 - remove unused prefixed properties, e.g. if compiling for Firefox, remove the `-webkit-`s
 - keep `_` and `*` hacks in IE67, remove in all other browsers

## Why

Because CSS is on the critical path to rendering pages. It must be small! Or else!

Why send extra bytes the browser has no use for? Walk in Firefox's shoes for a minute. You've just served something like:

```css
a {
  filter: progid:microsoft:obladi:oblada:AlphaImageLoader(bananas.png);
}
```

You can imagine Firefox thinking: "This is BS... I mean ... too browser-specific! I've no use for this. And I don't appreciate you wasting my time. I could've been delighting your users with your gorgeous app and instead look at me - having to sift through this nonsense"

## Installation

    $ npm install bscss

## Browsers

The list of supported browsers is as follows:

 - IE (6, 7, 8, 9, 10, 11)
 - Chrome
 - Firefox
 - Safari
 - iOS Safari
 - Opera

## Usage

```js
  var bs = require('bscss');
  var css = 
    'a{color: red; _color: blue; -o-stuff: cool; -ms-filter: 1}';
  css = bs.transform(css, 'chrome');
```

This spits out only the `color: red`, the rest is stripped.

`bs.transform(css, 'ie7');` for example will keep the `color:blue` too and remove the `-`-prefixed properties.
In IE6 and IE7 the hack characters are removed, e.g. `_color` becomes `color`

