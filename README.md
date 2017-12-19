# noscroll.js

This is an alpha version. There may be mistakes, and the interface may change.

Responsive design layout for web pages without scrolling.

noscroll.js provides the function ```noscroll.addLayout``` called for every possible layout your page may have.

- The layout with the closest aspect ratio and pixel count parameters is rendered on load and resize.
- The behavior of newlines counting as whitespace is removed so your layout definition can use multiple lines.
- Sibling elements without defined dimensions are set to fill the available space equally, and when only some sibling elements have dimensions defined the rest take up the remaining space equally.

See the examples for usage. Released under the MIT license.
