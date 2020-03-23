'use strict'

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.feedPosition = feedPosition
exports.jumpPosition = jumpPosition
exports.makeInitialPosition = makeInitialPosition
exports.copyPosition = copyPosition
exports.default = lexer
exports.lex = lex
exports.findTextEnd = findTextEnd
exports.lexText = lexText
exports.lexComment = lexComment
exports.lexTag = lexTag
exports.isWhitespaceChar = isWhitespaceChar
exports.lexTagName = lexTagName
exports.lexTagAttributes = lexTagAttributes
exports.lexSkipTag = lexSkipTag

let _compat = require('./compat')

function feedPosition (position, str, len) {
  let start = position.index
  let end = position.index = start + len
  for (let i = start; i < end; i++) {
    let char = str.charAt(i)
    if (char === '\n') {
      position.line++
      position.column = 0
    } else {
      position.column++
    }
  }
}

function jumpPosition (position, str, end) {
  let len = end - position.index
  return feedPosition(position, str, len)
}

function makeInitialPosition () {
  return {
    index: 0,
    column: 0,
    line: 0
  }
}

function copyPosition (position) {
  return {
    index: position.index,
    line: position.line,
    column: position.column
  }
}

function lexer (str, options) {
  let state = {
    str: str,
    options: options,
    position: makeInitialPosition(),
    tokens: []
  }
  lex(state)
  return state.tokens
}

function lex (state) {
  let str = state.str
  let childlessTags = state.options.childlessTags

  let len = str.length
  while (state.position.index < len) {
    let start = state.position.index
    lexText(state)
    if (state.position.index === start) {
      let isComment = (0, _compat.startsWith)(str, '!--', start + 1)
      if (isComment) {
        lexComment(state)
      } else {
        let tagName = lexTag(state)
        let safeTag = tagName.toLowerCase()
        if ((0, _compat.arrayIncludes)(childlessTags, safeTag)) {
          lexSkipTag(tagName, state)
        }
      }
    }
  }
}

let alphanumeric = /[A-Za-z0-9]/
function findTextEnd (str, index) {
  while (true) {
    let textEnd = str.indexOf('<', index)
    if (textEnd === -1) {
      return textEnd
    }
    let char = str.charAt(textEnd + 1)
    if (char === '/' || char === '!' || alphanumeric.test(char)) {
      return textEnd
    }
    index = textEnd + 1
  }
}

function lexText (state) {
  let type = 'text'
  let str = state.str
  let position = state.position

  let textEnd = findTextEnd(str, position.index)
  if (textEnd === position.index) return
  if (textEnd === -1) {
    textEnd = str.length
  }

  let start = copyPosition(position)
  let content = str.slice(position.index, textEnd)
  jumpPosition(position, str, textEnd)
  let end = copyPosition(position)
  state.tokens.push({ type: type, content: content, position: { start: start, end: end } })
}

function lexComment (state) {
  let str = state.str
  let position = state.position

  let start = copyPosition(position)
  feedPosition(position, str, 4) // "<!--".length
  let contentEnd = str.indexOf('-->', position.index)
  let commentEnd = contentEnd + 3 // "-->".length
  if (contentEnd === -1) {
    contentEnd = commentEnd = str.length
  }

  let content = str.slice(position.index, contentEnd)
  jumpPosition(position, str, commentEnd)
  state.tokens.push({
    type: 'comment',
    content: content,
    position: {
      start: start,
      end: copyPosition(position)
    }
  })
}

function lexTag (state) {
  let str = state.str
  let position = state.position

  let secondChar = str.charAt(position.index + 1)
  let close = secondChar === '/'
  let start = copyPosition(position)
  feedPosition(position, str, close ? 2 : 1)
  state.tokens.push({ type: 'tag-start', close: close, position: { start: start } })

  let tagName = lexTagName(state)
  lexTagAttributes(state)

  let firstChar = str.charAt(position.index)
  let _close = firstChar === '/'
  feedPosition(position, str, _close ? 2 : 1)
  let end = copyPosition(position)
  state.tokens.push({ type: 'tag-end', close: _close, position: { end: end } })

  return tagName
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#special-white-space
let whitespace = /\s/
function isWhitespaceChar (char) {
  return whitespace.test(char)
}

function lexTagName (state) {
  let str = state.str
  let position = state.position

  let len = str.length
  let start = position.index
  while (start < len) {
    let char = str.charAt(start)
    let isTagChar = !(isWhitespaceChar(char) || char === '/' || char === '>')
    if (isTagChar) break
    start++
  }

  let end = start + 1
  while (end < len) {
    let _char = str.charAt(end)
    let _isTagChar = !(isWhitespaceChar(_char) || _char === '/' || _char === '>')
    if (!_isTagChar) break
    end++
  }

  jumpPosition(position, str, end)
  let tagName = str.slice(start, end)
  state.tokens.push({
    type: 'tag',
    content: tagName
  })
  return tagName
}

function lexTagAttributes (state) {
  let str = state.str
  let position = state.position
  let tokens = state.tokens

  let cursor = position.index
  let quote = null // null, single-, or double-quote
  let wordBegin = cursor // index of word start
  let words = [] // "key", "key=value", "key='value'", etc
  let len = str.length
  while (cursor < len) {
    let char = str.charAt(cursor)
    if (quote) {
      let isQuoteEnd = char === quote
      if (isQuoteEnd) {
        quote = null
      }
      cursor++
      continue
    }

    let isTagEnd = char === '/' || char === '>'
    if (isTagEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor))
      }
      break
    }

    let isWordEnd = isWhitespaceChar(char)
    if (isWordEnd) {
      if (cursor !== wordBegin) {
        words.push(str.slice(wordBegin, cursor))
      }
      wordBegin = cursor + 1
      cursor++
      continue
    }

    let isQuoteStart = char === '\'' || char === '"'
    if (isQuoteStart) {
      quote = char
      cursor++
      continue
    }

    cursor++
  }
  jumpPosition(position, str, cursor)

  let wLen = words.length
  let type = 'attribute'
  for (let i = 0; i < wLen; i++) {
    let word = words[i]
    let isNotPair = word.indexOf('=') === -1
    if (isNotPair) {
      let secondWord = words[i + 1]
      if (secondWord && (0, _compat.startsWith)(secondWord, '=')) {
        if (secondWord.length > 1) {
          let newWord = word + secondWord
          tokens.push({ type: type, content: newWord })
          i += 1
          continue
        }
        let thirdWord = words[i + 2]
        i += 1
        if (thirdWord) {
          let _newWord = word + '=' + thirdWord
          tokens.push({ type: type, content: _newWord })
          i += 1
          continue
        }
      }
    }
    if ((0, _compat.endsWith)(word, '=')) {
      let _secondWord = words[i + 1]
      if (_secondWord && !(0, _compat.stringIncludes)(_secondWord, '=')) {
        let _newWord3 = word + _secondWord
        tokens.push({ type: type, content: _newWord3 })
        i += 1
        continue
      }

      let _newWord2 = word.slice(0, -1)
      tokens.push({ type: type, content: _newWord2 })
      continue
    }

    tokens.push({ type: type, content: word })
  }
}

let push = [].push

function lexSkipTag (tagName, state) {
  let str = state.str
  let position = state.position
  let tokens = state.tokens

  let safeTagName = tagName.toLowerCase()
  let len = str.length
  let index = position.index
  while (index < len) {
    let nextTag = str.indexOf('</', index)
    if (nextTag === -1) {
      lexText(state)
      break
    }

    let tagStartPosition = copyPosition(position)
    jumpPosition(tagStartPosition, str, nextTag)
    let tagState = { str: str, position: tagStartPosition, tokens: [] }
    let name = lexTag(tagState)
    if (safeTagName !== name.toLowerCase()) {
      index = tagState.position.index
      continue
    }

    if (nextTag !== position.index) {
      let textStart = copyPosition(position)
      jumpPosition(position, str, nextTag)
      tokens.push({
        type: 'text',
        content: str.slice(textStart.index, nextTag),
        position: {
          start: textStart,
          end: copyPosition(position)
        }
      })
    }

    push.apply(tokens, tagState.tokens)
    jumpPosition(position, str, tagState.position.index)
    break
  }
}
// # sourceMappingURL=lexer.js.map
