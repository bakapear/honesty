let himalaya = require('./himalaya')

function pass (node, compare) {
  let attrib = (node, name) => {
    if (node.attributes) {
      let attrib = node.attributes.find(x => x.key === name)
      if (attrib && attrib.value) return attrib.value
    }
    return ''
  }
  if (compare.any) return true
  return [
    !compare.tag || node.tagName === compare.tag,
    !compare.classes.length || compare.classes.every(x => attrib(node, 'class').split(' ').includes(x)),
    !compare.id || attrib(node, 'id') === compare.id
  ].every(x => x)
}

function children (node, callback) {
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      callback(node.children[i])
    }
  }
}

function walk (node, callback) {
  let children = node.children
  if (Array.isArray(node)) children = node
  else callback(node)
  if (children) {
    let child = children[0]
    let i = 0
    while (child) {
      walk(child, callback)
      child = children[++i]
    }
  }
}

function input (str) {
  str = str.replace(/\s+/g, ' ').replace(/\s*>\s*/g, '>').split(' ')
  let res = []
  for (let i = 0; i < str.length; i++) {
    let parts = str[i].split('>')
    for (let j = 0; j < parts.length; j++) {
      parts[j] = format(parts[j])
    }
    res.push(parts)
  }
  return res
}

function format (str) {
  let regex = /(?:\s|^)([^.#:([\s]+)|#([^.#:([\s]+)|\.([^.#:([\s]+)|:([^.#:[\s]+)|\[(.+?)\]/g
  let match = null
  let res = { tag: null, classes: [] }
  if (str === '*') return { any: true }
  do {
    match = regex.exec(str)
    if (match) {
      if (match[1]) res.tag = match[1]
      if (match[2]) res.id = match[2]
      if (match[3]) res.classes.push(match[3])
      // TODO: add support for pseudo (nth-child) and these div[class="meow"] aswell later (update pass function for checks)
    }
  } while (match)
  return res
}

module.exports = function (html) {
  let parsed = himalaya.parse(html, { ...himalaya.parseDefaults, includePositions: true })
  return function query (selector, ref) {
    if (typeof selector !== 'string') {
      ref = selector
      selector = null
    }
    if (ref) parsed = Array.isArray(ref) ? ref : [ref]
    let res = []
    if (!selector) res = parsed
    else {
      let payload = input(selector)
      for (let i = 0; i < payload.length; i++) {
        for (let j = 0; j < payload[i].length; j++) {
          if (res.length) {
            parsed = res
            res = []
          }
          if (payload[i][j].any || j > 0) {
            for (let k = 0; k < parsed.length; k++) {
              children(parsed[k], node => {
                if (pass(node, payload[i][j])) res.push(node)
              })
            }
          } else {
            walk(parsed, node => {
              if (pass(node, payload[i][j])) res.push(node)
            })
          }
        }
      }
    }
    res.html = trim => {
      let a = res.map(x => html.substring(x.position.start.index, x.position.end.index)).join('')
      return trim ? a.replace(/>\s+</g, '') : a
    }
    res.text = trim => {
      let a = res.html(trim).replace(/<[^>]*>/g, '')
      return trim ? a.trim() : a
    }
    res.find = selector => query(selector, res)
    return res
  }
}
