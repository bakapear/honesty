let himalaya = require('./himalaya')

function pass (node, compare) {
  if (compare.any) return true
  return [
    !compare.tag || node.tag === compare.tag,
    !compare.classes.length || (node.attribs && compare.classes.every(x => (node.attribs.class || '').split(' ').includes(x))),
    !compare.id || (node.attribs && node.attribs.id === compare.id)
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
  let body = himalaya.parse(html, { ...himalaya.parseDefaults, includePositions: true })
  return function query (selector, ref) {
    let parsed = body
    if (typeof selector !== 'string') {
      ref = selector
      selector = null
    }
    if (ref) parsed = Array.isArray(ref) ? ref : [ref]
    else parsed = body.slice()
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
      let a = decodeEntities(res.html(trim).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''))
      return trim ? a.trim() : a
    }
    res.find = selector => query(selector, res)
    res.append = str => {
      let last = res[res.length - 1].position.end.index
      while (true) {
        last--
        if (html[last + 1] === '<') break
      }
      html = html.substr(0, last) + str + html.substring(last + 1, html.length)
      body = himalaya.parse(html, { ...himalaya.parseDefaults, includePositions: true })
    }
    return res
  }
}

function decodeEntities (str) {
  if (!str) return str
  let regex = /&(nbsp|amp|quot|lt|gt);/g
  let translate = { nbsp: ' ', amp: '&', quot: '"', lt: '<', gt: '>' }
  return str.replace(regex, (m, e) => translate[e]).replace(/&#(\d+);/gi, (m, e) => String.fromCharCode(parseInt(e, 10)))
}
