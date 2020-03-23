'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.splitHead = splitHead
exports.unquote = unquote
exports.format = format
exports.formatAttributes = formatAttributes
function splitHead (str, sep) {
  let idx = str.indexOf(sep)
  if (idx === -1) return [str]
  return [str.slice(0, idx), str.slice(idx + sep.length)]
}

function unquote (str) {
  let car = str.charAt(0)
  let end = str.length - 1
  let isQuoteStart = car === '"' || car === "'"
  if (isQuoteStart && car === str.charAt(end)) {
    return str.slice(1, end)
  }
  return str
}

function format (nodes, options) {
  return nodes.map(function (node) {
    let type = node.type
    let outputNode = type === 'element' ? {
      type: type,
      tag: node.tagName.toLowerCase(),
      attribs: formatAttributes(node.attributes),
      children: format(node.children, options)
    } : { type: type, content: node.content }
    if (options.includePositions) {
      outputNode.position = node.position
    }
    return outputNode
  })
}

function formatAttributes (attributes) {
  let obj = {}
  attributes.forEach(function (attribute) {
    let parts = splitHead(attribute.trim(), '=')
    let key = parts[0]
    let value = typeof parts[1] === 'string' ? unquote(parts[1]) : null
    obj[key] = value
  })
  return obj
}
// # sourceMappingURL=format.js.map
