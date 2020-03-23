'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.parseDefaults = undefined
exports.parse = parse
exports.stringify = stringify

let _lexer = require('./lexer')

let _lexer2 = _interopRequireDefault(_lexer)

let _parser = require('./parser')

let _parser2 = _interopRequireDefault(_parser)

let _format = require('./format')

let _stringify = require('./stringify')

let _tags = require('./tags')

function _interopRequireDefault (obj) { return obj && obj.__esModule ? obj : { default: obj } }

let parseDefaults = exports.parseDefaults = {
  voidTags: _tags.voidTags,
  closingTags: _tags.closingTags,
  childlessTags: _tags.childlessTags,
  closingTagAncestorBreakers: _tags.closingTagAncestorBreakers,
  includePositions: false
}

function parse (str) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : parseDefaults

  let tokens = (0, _lexer2.default)(str, options)
  let nodes = (0, _parser2.default)(tokens, options)
  return (0, _format.format)(nodes, options)
}

function stringify (ast) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : parseDefaults

  return (0, _stringify.toHTML)(ast, options)
}
// # sourceMappingURL=index.js.map
