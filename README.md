# honesty
queryselector for node

Uses the [himalaya](https://www.npmjs.com/package/himalaya) package.

```js
let hy = require("honesty")

let $ = hy('<div id="cheese">Woof</div>')
let text = $('#cheese').text()
...
```