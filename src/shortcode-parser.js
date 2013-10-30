
/* src/shortcode-parser.js */

var fs = require('fs');
var util = require('util');

var shortcodes = {};

var SHORTCODE_ATTRS = /(\s+([a-z0-9\-_]+|([a-z0-9\-_]+)\s*=\s*([a-z0-9\-_]+|\d+\.\d+|'[^']*'|"[^"]*")))*/.toString().slice(1,-1);
var SHORTCODE_SLASH = /\s*\/?\s*/.toString().slice(1,-1);
var SHORTCODE_OPEN = /\[\s*%s/.toString().slice(1,-1);
var SHORTCODE_RIGHT_BRACKET = '\\]';
var SHORTCODE_CLOSE = /\[\s*\/\s*%s\s*\]/.toString().slice(1,-1);
var SHORTCODE_CONTENT = /(.|\n|)*?/.toString().slice(1,-1);
var SHORTCODE_SPACE = /\s*/.toString().slice(1,-1);

function typecast(val) {
  val = val.trim().replace(/(^['"]|['"]$)/g, '');
  if (/^\d+$/.test(val)) {
    return parseInt(val, 10);
  } else if (/^\d+\.\d+$/.test(val)) {
    return parseFloat(val);
  } else if (/^(true|false)$/.test(val)) {
    return (val === 'true');
  } else if (/^undefined$/.test(val)) {
    return undefined;
  } else if (/^null$/i.test(val)) {
    return null;
  } else {
    return val;
  }
}

function parseShortcode(name, buf, inline) {
  
  var regex, match, data = {}, attr = {};
  
  if (inline) {
    regex = new RegExp('^' + util.format(SHORTCODE_OPEN, name)
    + SHORTCODE_ATTRS
    + SHORTCODE_SPACE
    + SHORTCODE_SLASH
    + SHORTCODE_RIGHT_BRACKET);
  } else {
    regex = new RegExp('^' + util.format(SHORTCODE_OPEN, name)
    + SHORTCODE_ATTRS
    + SHORTCODE_SPACE
    + SHORTCODE_RIGHT_BRACKET);
  }
  
  while ((match = buf.match(regex)) !== null) {
    var key = match[3] || match[2];
    var val = match[4] || match[3];
    var pattern = match[1];
    if (pattern) {
      var idx = buf.lastIndexOf(pattern);
      attr[key] = (val !== undefined) ? typecast(val) : true;
      buf = buf.slice(0, idx) + buf.slice(idx + pattern.length);
    } else {
      break;
    }
  }
  
  attr = Object.keys(attr).reverse().reduce(function(prev, current) {
    prev[current] = attr[current]; return prev;
  }, {});
  
  buf = buf.replace(regex, '').replace(new RegExp(util.format(SHORTCODE_CLOSE, name)), '');

  return {
    attr: attr,
    content: buf
  }

}

module.exports = {
  
  _shortcodes: shortcodes,
  
  add: function (name, callback) {
    shortcodes[name] = callback;
  },
  
  remove: function(name) {
    delete shortcodes[name];
  },
  
  parse: function(buf, ob) {
    
    var context = ob || shortcodes;
    
    for (var name in context) {
    
      var regex = {
        wrapper: new RegExp(util.format(SHORTCODE_OPEN, name)
        + SHORTCODE_ATTRS
        + SHORTCODE_RIGHT_BRACKET
        + SHORTCODE_CONTENT
        + util.format(SHORTCODE_CLOSE, name), 'g'),
        inline: new RegExp(util.format(SHORTCODE_OPEN, name)
        + SHORTCODE_ATTRS
        + SHORTCODE_SLASH
        + SHORTCODE_RIGHT_BRACKET, 'g')
      }
      
      var matches = buf.match(regex.wrapper);
    
      if (matches) {
        for (var m,data,i=0,len=matches.length; i < len; i++) {
          m = matches[i];
          data = parseShortcode(name, m);
          buf = buf.replace(m, context[name].call(null, data.content, data.attr));
        }
      }

      matches = buf.match(regex.inline);
      
      if (matches) {
      
        while((m = matches.shift()) !== undefined) {
          data = parseShortcode(name, m, true);
          buf = buf.replace(m, context[name].call(null, data.content, data.attr));
        }

      }
      
    }
  
    return buf;
  
  }
  
}