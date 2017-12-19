// Copyright 2017 Matthew Juran
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// alpha version

// noscroll provides the function noscroll.addLayout for HTML page layouts meant to work with resizing, without any scrolling, and with varying layouts by toggling or by dimension, where element dimensions are defined by CSS width and height in percentage. The HTML behavior of newline counting as whitespace is removed so your layout definition can use multiple lines. Sibling elements without defined dimensions are set to fill the available space equally, and when only some sibling elements have dimensions defined the rest take up the remaining space equally. Elements are centered horizontally and vertically within their space.
(function(noscroll, $, undefined) {

// Use this value if you'd like this layout to apply in all cases above the previous maximum ratio layout.
noscroll.LayoutMaxRatio = 1000;

class Layout {
    constructor(maxRatio, minPixels, html) {
        this.maxRatio = maxRatio;
        this.minPixels = minPixels;
        this.html = Layout.minimizedHTML(html);
    }
    static minimizedHTML(html) {
        // https://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
        // https://stackoverflow.com/questions/12014441/remove-every-white-space-between-tags-using-javascript
        return html.replace(/(<(pre|script|style|textarea)[^]+?<\/\2)|(^|>)\s+|\s+(?=<|$)/g, "$1$3");
    }
};

$(window).resize(function() { layout($(window).width(), $(window).height()); });
$(document).ready(function() { $(window).resize(); });

var layouts = [];

// TODO: multiple indexed layouts for each setting

noscroll.addLayout = function(maxRatio, minPixels, html) {
    layouts.push(new Layout(maxRatio, minPixels, html));
}

function layout(width, height) {
    $('body').css({padding: '0px', margin: '0px', border: '0px', height: $(window).height(), width: $(window).width()});
    $('body').html(pick(width, height));
    layoutElement($('body'));
}

// Pick the best provided layout for the window parameters.
function pick(width, height) {
    if (layouts.length == 0) {
        throw 'noscroll: no layouts defined';
    }
    var ratio = width / height;
    var pixels = width * height;
    var use = null;
    for (var i = 0; i < layouts.length; i++) {
        if ((layouts[i].maxRatio >= ratio) && (layouts[i].minPixels <= pixels)) {
            if (use == null) {
                use = layouts[i];
                continue;
            }
            if ((use.maxRatio == layouts[i].maxRatio) && (use.minPixels == layouts[i].minPixels)) {
                throw 'noscroll: duplicate layout parameters';
            }
            if ((use.maxRatio - ratio) > (layouts[i].maxRatio - ratio)) {
                if ((pixels - use.minPixels) > (pixels - layouts[i].minPixels)) {
                    use = layouts[i];
                }
            }
        }
    }
    if (use == null) {
        throw 'noscroll: no layout found';
    }
    return use.html;
}

// Recursively travels the tree of elements and fits them within the provided dimensions.
// Written CSS properties are first inspected in order of ID, Class, Tag for specified width and height in percentage form.
// If a CSS selector defines a dimension it must define both dimensions in percentage form.
// If no width or height is defined then the element uses the remaining space, or equal space with other sibling elements if none are defined.
// Sibling elements must be either all display: block or all display: inline-block.
function layoutElement(jQueryElement) {
    var inline = null;
    var elements = [];
    var widths = [];
    var heights = [];
    var setCSSDims = function(selector, index) {
        var cssWidth = cssProperty(selector, 'width');
        if (cssWidth == null) {
            return false;
        }
        if (cssWidth.includes('%') == false) {
            throw 'noscroll: ' + selector + ' width property \'' + cssWidth + '\' not a percentage';
        }
        var cssHeight = cssProperty(selector, 'height');
        if (cssHeight == null) {
            return false;
        }
        if (cssHeight.includes('%') == false) {
            throw 'noscroll: ' + selector + ' height property \'' + cssHeight + '\' not a percentage';
        }
        widths[index] = parseFloat(cssWidth);
        heights[index] = parseFloat(cssHeight);
        return true;
    };
    jQueryElement.children().each(function(index, element) {
        // https://www.w3schools.com/css/css3_box-sizing.asp
        $(element).css('box-sizing', 'border-box');
        elements[index] = element;
        if (inline == null) {
            inline = elementInline(element);
        } else {
            if (((inline == false) && elementInline(element)) || (inline && (elementInline(element) == false))) {
                throw 'noscroll: mix of block and inline-block sibling elements';
            }
        }
        if (element.id != "") {
            if (setCSSDims(element.id, index)) {
                return;
            }
        }
        var classes = element.classList;
        for (var i = 0; i < classes.length; i++) {
            if (setCSSDims('.'+classes[i], index)) {
                return;
            }
        }
        if (setCSSDims(element.tagName.toLowerCase(), index)) {
            return;
        }
        widths[index] = null;
        heights[index] = null;
    });
    if (elements.length == 0) {
        return;
    }
    // block elements are constrained together for height but can be any width
    if (inline == false) {
        var totalHeight = 0;
        var nullHeights = 0;
        for (var i = 0; i < elements.length; i++) {
            if (heights[i] != null) {
                totalHeight += heights[i];
            } else {
                nullHeights++;
            }
        }
        if (totalHeight > 100) {
            throw 'noscroll: sibling block height greater than 100%';
        }
        if (nullHeights > 0) {
            var nullHeight = (100 - totalHeight) / nullHeights;
            for (var i = 0; i < elements.length; i++) {
                if (heights[i] == null) {
                    heights[i] = nullHeight;
                    widths[i] = 100;
                }
            }
        }
    } else {
        var totalWidth = 0;
        var nullWidths = 0;
        for (var i = 0; i < elements.length; i++) {
            // inline-block elements require vertical-align: top to be set for correct spacing
            $(elements[i]).css('vertical-align', 'top');
            if (widths[i] != null) {
                totalWidth += widths[i];
            } else {
                nullWidths++;
            }
        }
        if (totalWidth > 100) {
            throw 'noscroll: sibling inline-block width greater than 100%';
        }
        if (nullWidths > 0) {
            var nullWidth = (100 - totalWidth) / nullWidths;
            for (var i = 0; i < elements.length; i++) {
                if (widths[i] == null) {
                    widths[i] = nullWidth;
                    heights[i] = 100;
                }
            }
        }
    }
    for (var i = 0; i < elements.length; i++) {
        var e = $(elements[i]);
        e.css('width', ((widths[i] / 100) * jQueryElement.innerWidth()) + 'px');
        e.css('height', ((heights[i] / 100) * jQueryElement.innerHeight()) + 'px');
        layoutElement(e);
    }
}

function elementInline(element) {
    // https://stackoverflow.com/questions/2880957/detect-inline-block-type-of-a-dom-element
    var s = element.currentStyle || window.getComputedStyle(element, '');
    if (s.display == 'inline-block') {
        return true;
    } else if (s.display == 'block') {
        return false;
    }
    throw 'noscroll: element not block or inline-block';
}

// Returns null if the property is not defined in CSS text.
function cssProperty(selector, property) {
    var rules = document.styleSheets[0].cssRules;
    for (var i = 0; i < rules.length; i++) {
        if (rules[i].selectorText != selector) {
            continue;
        }
        switch (property) {
            case 'width':
                if (rules[i].style.width != '') {
                    return rules[i].style.width;
                }
                break;
            case 'height':
                if (rules[i].style.height != '') {
                    return rules[i].style.height;
                }
                break;
            default:
                throw 'noscroll: unimplemented property ' + property;
        }
    }
    return null;
}

// https://stackoverflow.com/questions/881515/how-do-i-declare-a-namespace-in-javascript
}(window.noscroll = window.noscroll || {}, jQuery));
