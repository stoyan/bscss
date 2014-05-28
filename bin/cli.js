#!/usr/bin/env node

var bs = require("../index.js");
var read = require('fs').readFileSync;

var css = read(process.argv[2], 'utf8').toString();
var browser = process.argv[3];

console.log(bs.transform(css, browser));
