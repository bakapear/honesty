'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.default = parser
exports.hasTerminalParent = hasTerminalParent
exports.rewindStack = rewindStack
exports.parse = parse

let _compat = require('./compat')

function parser (tokens, options) {
  let root = { tagName: null, children: [] }
  let state = { tokens: tokens, options: options, cursor: 0, stack: [root] }
  parse(state)
  return root.children
}

function hasTerminalParent (tagName, stack, terminals) {
  let tagParents = terminals[tagName]
  if (tagParents) {
    let currentIndex = stack.length - 1
    while (currentIndex >= 0) {
      let parentTagName = stack[currentIndex].tagName
      if (parentTagName === tagName) {
        break
      }
      if ((0, _compat.arrayIncludes)(tagParents, parentTagName)) {
        return true
      }
      currentIndex--
    }
  }
  return false
}

function rewindStack (stack, newLength, childrenEndPosition, endPosition) {
  stack[newLength].position.end = endPosition
  for (let i = newLength + 1, len = stack.length; i < len; i++) {
    stack[i].position.end = childrenEndPosition
  }
  stack.splice(newLength)
}

function parse (state) {
  let tokens = state.tokens
  let options = state.options
  let stack = state.stack

  let nodes = stack[stack.length - 1].children
  let len = tokens.length
  let cursor = state.cursor

  while (cursor < len) {
    let token = tokens[cursor]
    if (token.type !== 'tag-start') {
      nodes.push(token)
      cursor++
      continue
    }

    let tagToken = tokens[++cursor]
    cursor++
    let tagName = tagToken.content.toLowerCase()
    if (token.close) {
      let index = stack.length
      let shouldRewind = false
      while (--index > -1) {
        if (stack[index].tagName === tagName) {
          shouldRewind = true
          break
        }
      }
      while (cursor < len) {
        let endToken = tokens[cursor]
        if (endToken.type !== 'tag-end') break
        cursor++
      }
      if (shouldRewind) {
        rewindStack(stack, index, token.position.start, tokens[cursor - 1].position.end)
        break
      } else {
        continue
      }
    }

    let isClosingTag = (0, _compat.arrayIncludes)(options.closingTags, tagName)
    let shouldRewindToAutoClose = isClosingTag
    if (shouldRewindToAutoClose) {
      let terminals = options.closingTagAncestorBreakers

      shouldRewindToAutoClose = !hasTerminalParent(tagName, stack, terminals)
    }

    if (shouldRewindToAutoClose) {
      // rewind the stack to just above the previous
      // closing tag of the same name
      let currentIndex = stack.length - 1
      while (currentIndex > 0) {
        if (tagName === stack[currentIndex].tagName) {
          rewindStack(stack, currentIndex, token.position.start, token.position.start)
          let previousIndex = currentIndex - 1
          nodes = stack[previousIndex].children
          break
        }
        currentIndex = currentIndex - 1
      }
    }

    let attributes = []
    let attrToken = void 0
    while (cursor < len) {
      attrToken = tokens[cursor]
      if (attrToken.type === 'tag-end') break
      attributes.push(attrToken.content)
      cursor++
    }

    cursor++
    let children = []
    let position = {
      start: token.position.start,
      end: attrToken.position.end
    }
    let elementNode = {
      type: 'element',
      tagName: tagToken.content,
      attributes: attributes,
      children: children,
      position: position
    }
    nodes.push(elementNode)

    let hasChildren = !(attrToken.close || (0, _compat.arrayIncludes)(options.voidTags, tagName))
    if (hasChildren) {
      let size = stack.push({ tagName: tagName, children: children, position: position })
      let innerState = { tokens: tokens, options: options, cursor: cursor, stack: stack }
      parse(innerState)
      cursor = innerState.cursor
      let rewoundInElement = stack.length === size
      if (rewoundInElement) {
        elementNode.position.end = tokens[cursor - 1].position.end
      }
    }
  }
  state.cursor = cursor
}
// # sourceMappingURL=parser.js.map
