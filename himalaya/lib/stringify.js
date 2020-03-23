'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.formatAttributes = formatAttributes
exports.toHTML = toHTML

let _compat = require('./compat')

function formatAttributes (attributes) {
  return attributes.reduce(function (attrs, attribute) {
    let key = attribute.key
    let value = attribute.value

    if (value === null) {
      return attrs + ' ' + key
    }
    let quoteEscape = value.indexOf('\'') !== -1
    let quote = quoteEscape ? '"' : '\''
    return attrs + ' ' + key + '=' + quote + value + quote
  }, '')
}

function toHTML (tree, options) {
  return tree.map(function (node) {
    if (node.type === 'text') {
      return node.content
    }
    if (node.type === 'comment') {
      return '<!--' + node.content + '-->'
    }
    let tagName = node.tagName
    let attributes = node.attributes
    let children = node.children

    let isSelfClosing = (0, _compat.arrayIncludes)(options.voidTags, tagName.toLowerCase())
    return isSelfClosing ? '<' + tagName + formatAttributes(attributes) + '>' : '<' + tagName + formatAttributes(attributes) + '>' + toHTML(children, options) + '</' + tagName + '>'
  }).join('')
}

exports.default = { toHTML: toHTML }
// # sourceMappingURL=stringify.js.map
