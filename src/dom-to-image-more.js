(function(global) {
    'use strict';

    var util = newUtil();
    var inliner = newInliner();
    var fontFaces = newFontFaces();
    var images = newImages();

    // Default impl options
    var defaultOptions = {
        // Default is to fail on error, no placeholder
        imagePlaceholder: undefined,
        // Default cache bust is false, it will use the cache
        cacheBust: false,
        // Use (existing) authentication credentials for external URIs (CORS requests)
        useCredentials: false
    };

    var domtoimage = {
        toSvg: toSvg,
        toPng: toPng,
        toJpeg: toJpeg,
        toBlob: toBlob,
        toPixelData: toPixelData,
        toCanvas: toCanvas,
        impl: {
            fontFaces: fontFaces,
            images: images,
            util: util,
            inliner: inliner,
            options: {}
        }
    };

    if (typeof exports === "object" && typeof module === "object")
        module.exports = domtoimage;
    else
        global.domtoimage = domtoimage;

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options
     * @param {Function} options.filter - Should return true if passed node should be included in the output
     *          (excluding node means excluding it's children as well). Not called on the root node.
     * @param {Function} options.onclone - Callback function which is called when the Document has been cloned for
     *         rendering, can be used to modify the contents that will be rendered without affecting the original
     *         source document.
     * @param {String} options.bgcolor - color for the background, any valid CSS color value.
     * @param {Number} options.width - width to be applied to node before rendering.
     * @param {Number} options.height - height to be applied to node before rendering.
     * @param {Object} options.style - an object whose properties to be copied to node's style before rendering.
     * @param {Number} options.quality - a Number between 0 and 1 indicating image quality (applicable to JPEG only),
                defaults to 1.0.
     * @param {Booolean} options.raster - Used internally to track whether the output is a raster image not requiring CSS reduction.
     * @param {Number} options.scale - a Number multiplier to scale up the canvas before rendering to reduce fuzzy images, defaults to 1.0.
     * @param {String} options.imagePlaceholder - dataURL to use as a placeholder for failed images, default behaviour is to fail fast on images we can't fetch
     * @param {Boolean} options.cacheBust - set to true to cache bust by appending the time to the request url
     * @return {Promise} - A promise that is fulfilled with a SVG image data URL
     * */
    function toSvg(node, options) {
        options = options || {};
        copyOptions(options);
        return Promise.resolve(node)
            .then(function(clonee) {
                const root = true;
                return cloneNode(clonee, options.filter, root, !options.raster);
            })
            .then(embedFonts)
            .then(inlineImages)
            .then(applyOptions)
            .then(function(clone) {
                return makeSvgDataUri(clone,
                    options.width || util.width(node),
                    options.height || util.height(node)
                );
            });

        function applyOptions(clone) {
            if (options.bgcolor) clone.style.backgroundColor = options.bgcolor;
            if (options.width) clone.style.width = options.width + 'px';
            if (options.height) clone.style.height = options.height + 'px';

            if (options.style)
                Object.keys(options.style).forEach(function(property) {
                    clone.style[property] = options.style[property];
                });

            var onCloneResult = null;

            if (typeof options.onclone === "function")
                onCloneResult = options.onclone(clone);

            return Promise.resolve(onCloneResult)
                .then(function () {
                    return clone;
                });
        }
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
     * */
    function toPixelData(node, options) {
        options = options || {};
        options.raster = true;
        return draw(node, options)
            .then(function(canvas) {
                return canvas.getContext('2d').getImageData(
                    0,
                    0,
                    util.width(node),
                    util.height(node)
                ).data;
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image data URL
     * */
    function toPng(node, options) {
        options = options || {};
        options.raster = true;
        return draw(node, options)
            .then(function(canvas) {
                return canvas.toDataURL();
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
     * */
    function toJpeg(node, options) {
        options = options || {};
        options.raster = true;
        return draw(node, options)
            .then(function(canvas) {
                return canvas.toDataURL('image/jpeg', options.quality || 1.0);
            });
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a PNG image blob
     * */
    function toBlob(node, options) {
        options = options || {};
        options.raster = true;
        return draw(node, options)
            .then(util.canvasToBlob);
    }

    /**
     * @param {Node} node - The DOM Node object to render
     * @param {Object} options - Rendering options, @see {@link toSvg}
     * @return {Promise} - A promise that is fulfilled with a canvas object
     * */
    function toCanvas(node, options) {
        return draw(node, options || {});
    }

    function copyOptions(options) {
        // Copy options to impl options for use in impl
        if (typeof(options.imagePlaceholder) === 'undefined') {
            domtoimage.impl.options.imagePlaceholder = defaultOptions.imagePlaceholder;
        } else {
            domtoimage.impl.options.imagePlaceholder = options.imagePlaceholder;
        }

        if (typeof(options.cacheBust) === 'undefined') {
            domtoimage.impl.options.cacheBust = defaultOptions.cacheBust;
        } else {
            domtoimage.impl.options.cacheBust = options.cacheBust;
        }

        if(typeof(options.useCredentials) === 'undefined') {
            domtoimage.impl.options.useCredentials = defaultOptions.useCredentials;
        } else {
            domtoimage.impl.options.useCredentials = options.useCredentials;
        }
    }

    function draw(domNode, options) {
        return toSvg(domNode, options)
            .then(util.makeImage)
            .then(util.delay(100))
            .then(function(image) {
                var scale = typeof(options.scale) !== 'number' ? 1 : options.scale;
                var canvas = newCanvas(domNode, scale);
                var ctx = canvas.getContext('2d');
                if (image) {
                    ctx.scale(scale, scale);
                    ctx.drawImage(image, 0, 0);
                }
                return canvas;
            });

        function newCanvas(node, scale) {
            var canvas = document.createElement('canvas');
            canvas.width = (options.width || util.width(node)) * scale;
            canvas.height = (options.height || util.height(node)) * scale;

            if (options.bgcolor) {
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = options.bgcolor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            return canvas;
        }
    }

    function cloneNode(node, filter, root, svg) {
        if (!root && filter && !filter(node)) return Promise.resolve();

        return Promise.resolve(node)
            .then(makeNodeCopy)
            .then(function(clone) {
                return cloneChildren(node, clone);
            })
            .then(function(clone) {
                return processClone(node, clone, svg);
            });

        function makeNodeCopy(original) {
            if (original instanceof HTMLCanvasElement) return util.makeImage(original.toDataURL());
            if(original.nodeName == "IFRAME"){
              return html2canvas(original.contentDocument.body)
              .then(canvas => {
                return canvas.toDataURL();
              }).then(util.makeImage);
            }
            return original.cloneNode(false);
        }

        function cloneChildren(original, clone) {
            var children = original.childNodes;
            if (children.length === 0) return Promise.resolve(clone);

            return cloneChildrenInOrder(clone, util.asArray(children))
                .then(function() {
                    return clone;
                });

            function cloneChildrenInOrder(parent, childs) {
                var done = Promise.resolve();
                childs.forEach(function(child) {
                    done = done
                        .then(function() {
                            return cloneNode(child, filter);
                        })
                        .then(function(childClone) {
                            if (childClone) parent.appendChild(childClone);
                        });
                });
                return done;
            }
        }

        function processClone(original, clone, svg) {
            if (!(clone instanceof Element)) return clone;

            return Promise.resolve()
                .then(cloneStyle)
                .then(clonePseudoElements)
                .then(copyUserInput)
                .then(fixSvg)
                .then(function() {
                    return clone;
                });

            function cloneStyle() {
                if (svg) {
                    copyStyle(getUserComputedStyle(original, root), clone.style);
                } else {
                    copyStyle(global.getComputedStyle(original), clone.style);
                }

                function copyFont(source, target) {
                    target.font = source.font;
                    target.fontFamily = source.fontFamily;
                    target.fontFeatureSettings = source.fontFeatureSettings;
                    target.fontKerning = source.fontKerning;
                    target.fontSize = source.fontSize;
                    target.fontStretch = source.fontStretch;
                    target.fontStyle = source.fontStyle;
                    target.fontVariant = source.fontVariant;
                    target.fontVariantCaps = source.fontVariantCaps;
                    target.fontVariantEastAsian = source.fontVariantEastAsian;
                    target.fontVariantLigatures = source.fontVariantLigatures;
                    target.fontVariantNumeric = source.fontVariantNumeric;
                    target.fontVariationSettings = source.fontVariationSettings;
                    target.fontWeight = source.fontWeight;
                }

                function copyStyle(source, target) {
                    if (source.cssText) {
                        target.cssText = source.cssText;
                        copyFont(source, target); // here we re-assign the font props.
                    } else copyProperties(source, target);

                    function copyProperties(from, to) {
                        util.asArray(from).forEach(function(name) {
                            to.setProperty(
                                name,
                                from.getPropertyValue(name),
                                from.getPropertyPriority(name)
                            );
                        });

                        // Remove positioning of root elements, which stops them from being captured correctly
                        if (root) {
                            ['inset-block', 'inset-block-start', 'inset-block-end'].forEach((prop) => target.removeProperty(prop));
                            ['left', 'right', 'top', 'bottom'].forEach((prop) => {
                                if (target.getPropertyValue(prop)) {
                                    target.setProperty(prop, '0px');
                                }
                            });
                        }
                    }
                }
            }

            function clonePseudoElements() {
                [':before', ':after'].forEach(function(element) {
                    clonePseudoElement(element);
                });

                function clonePseudoElement(element) {
                    var style = window.getComputedStyle(original, element);
                    var content = style.getPropertyValue('content');

                    if (content === '' || content === 'none') return;

                    var className = util.uid();
                    var currentClass = clone.getAttribute('class');
                    if (currentClass) {
                        clone.setAttribute('class', currentClass + ' ' + className);
                    }

                    var styleElement = document.createElement('style');
                    styleElement.appendChild(formatPseudoElementStyle());
                    clone.appendChild(styleElement);

                    function formatPseudoElementStyle() {
                        var selector = '.' + className + ':' + element;
                        var cssText = style.cssText ? formatCssText() : formatCssProperties();
                        return document.createTextNode(selector + '{' + cssText + '}');

                        function formatCssText() {
                            return style.cssText + ' content: ' +  style.getPropertyValue('content') + ';';
                        }

                        function formatCssProperties() {

                            return util.asArray(style)
                                .map(formatProperty)
                                .join('; ') + ';';

                            function formatProperty(name) {
                                return name + ': ' +
                                    style.getPropertyValue(name) +
                                    (style.getPropertyPriority(name) ? ' !important' : '');
                            }
                        }
                    }
                }
            }

            function copyUserInput() {
                if (original instanceof HTMLTextAreaElement) clone.innerHTML = original.value;
                if (original instanceof HTMLInputElement) clone.setAttribute("value", original.value);
            }

            function fixSvg() {
                if (!(clone instanceof SVGElement)) return;
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

                if (!(clone instanceof SVGRectElement)) return;
                ['width', 'height'].forEach(function(attribute) {
                    var value = clone.getAttribute(attribute);
                    if (!value) return;

                    clone.style.setProperty(attribute, value);
                });
            }
        }
    }

    function embedFonts(node) {
        return fontFaces.resolveAll()
            .then(function(cssText) {
                var styleNode = document.createElement('style');
                node.appendChild(styleNode);
                styleNode.appendChild(document.createTextNode(cssText));
                return node;
            });
    }

    function inlineImages(node) {
        return images.inlineAll(node)
            .then(function() {
                return node;
            });
    }

    function makeSvgDataUri(node, width, height) {
        return Promise.resolve(node)
            .then(function(svg) {
                svg.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
                return new XMLSerializer().serializeToString(svg);
            })
            .then(util.escapeXhtml)
            .then(function(xhtml) {
                return '<foreignObject x="0" y="0" width="100%" height="100%">' + xhtml + '</foreignObject>';
            })
            .then(function(foreignObject) {
                return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    foreignObject + '</svg>';
            })
            .then(function(svg) {
                return 'data:image/svg+xml;charset=utf-8,' + svg;
            });
    }

    function newUtil() {
        return {
            escape: escape,
            parseExtension: parseExtension,
            mimeType: mimeType,
            dataAsUrl: dataAsUrl,
            isDataUrl: isDataUrl,
            canvasToBlob: canvasToBlob,
            resolveUrl: resolveUrl,
            getAndEncode: getAndEncode,
            uid: uid(),
            delay: delay,
            asArray: asArray,
            escapeXhtml: escapeXhtml,
            makeImage: makeImage,
            width: width,
            height: height
        };

        function mimes() {
            /*
             * Only WOFF and EOT mime types for fonts are 'real'
             * see http://www.iana.org/assignments/media-types/media-types.xhtml
             */
            var WOFF = 'application/font-woff';
            var JPEG = 'image/jpeg';

            return {
                'woff': WOFF,
                'woff2': WOFF,
                'ttf': 'application/font-truetype',
                'eot': 'application/vnd.ms-fontobject',
                'png': 'image/png',
                'jpg': JPEG,
                'jpeg': JPEG,
                'gif': 'image/gif',
                'tiff': 'image/tiff',
                'svg': 'image/svg+xml'
            };
        }

        function parseExtension(url) {
            var match = /\.([^\.\/]*?)(\?|$)/g.exec(url);
            if (match) return match[1];
            else return '';
        }

        function mimeType(url) {
            var extension = parseExtension(url).toLowerCase();
            return mimes()[extension] || '';
        }

        function isDataUrl(url) {
            return url.search(/^(data:)/) !== -1;
        }

        function asBlob(canvas) {
            return new Promise(function(resolve) {
                var binaryString = window.atob(canvas.toDataURL().split(',')[1]);
                var length = binaryString.length;
                var binaryArray = new Uint8Array(length);

                for (var i = 0; i < length; i++)
                    binaryArray[i] = binaryString.charCodeAt(i);

                resolve(new Blob([binaryArray], {
                    type: 'image/png'
                }));
            });
        }

        function canvasToBlob(canvas) {
            if (canvas.toBlob)
                return new Promise(function(resolve) {
                    canvas.toBlob(resolve);
                });

            return asBlob(canvas);
        }

        function resolveUrl(url, baseUrl) {
            var doc = document.implementation.createHTMLDocument();
            var base = doc.createElement('base');
            doc.head.appendChild(base);
            var a = doc.createElement('a');
            doc.body.appendChild(a);
            base.href = baseUrl;
            a.href = url;
            return a.href;
        }

        function uid() {
            var index = 0;

            return function() {
                return 'u' + fourRandomChars() + index++;

                function fourRandomChars() {
                    /* see http://stackoverflow.com/a/6248722/2519373 */
                    return ('0000' + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
                }
            };
        }

        function makeImage(uri) {
            if (uri === 'data:,') return Promise.resolve();
            return new Promise(function(resolve, reject) {
                var image = new Image();
                if(domtoimage.impl.options.useCredentials) {
                    image.crossOrigin = 'use-credentials';
                }
                image.onload = function() {
                    resolve(image);
                };
                image.onerror = reject;
                image.src = uri;
            });
        }

        function getAndEncode(url) {
            var TIMEOUT = 30000;
            if (domtoimage.impl.options.cacheBust) {
                // Cache bypass so we dont have CORS issues with cached images
                // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
                url += ((/\?/).test(url) ? "&" : "?") + (new Date()).getTime();
            }

            return new Promise(function(resolve) {
                var request = new XMLHttpRequest();

                request.onreadystatechange = done;
                request.ontimeout = timeout;
                request.responseType = 'blob';
                request.timeout = TIMEOUT;
                if(domtoimage.impl.options.useCredentials) {
                    request.withCredentials = true;
                }
                request.open('GET', url, true);
                request.send();

                var placeholder;
                if (domtoimage.impl.options.imagePlaceholder) {
                    var split = domtoimage.impl.options.imagePlaceholder.split(/,/);
                    if (split && split[1]) {
                        placeholder = split[1];
                    }
                }

                function done() {
                    if (request.readyState !== 4) return;

                    if (request.status !== 200) {
                        if (placeholder) {
                            resolve(placeholder);
                        } else {
                            fail('cannot fetch resource: ' + url + ', status: ' + request.status);
                        }

                        return;
                    }

                    var encoder = new FileReader();
                    encoder.onloadend = function() {
                        var content = encoder.result.split(/,/)[1];
                        resolve(content);
                    };
                    encoder.readAsDataURL(request.response);
                }

                function timeout() {
                    if (placeholder) {
                        resolve(placeholder);
                    } else {
                        fail('timeout of ' + TIMEOUT + 'ms occured while fetching resource: ' + url);
                    }
                }

                function fail(message) {
                    console.error(message);
                    resolve('');
                }
            });
        }

        function dataAsUrl(content, type) {
            return 'data:' + type + ';base64,' + content;
        }

        function escape(string) {
            return string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1');
        }

        function delay(ms) {
            return function(arg) {
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        resolve(arg);
                    }, ms);
                });
            };
        }

        function asArray(arrayLike) {
            var array = [];
            var length = arrayLike.length;
            for (var i = 0; i < length; i++) array.push(arrayLike[i]);
            return array;
        }

        function escapeXhtml(string) {
            return string.replace(/%/g, "%25").replace(/#/g, '%23').replace(/\n/g, '%0A');
        }

        function width(node) {
            var leftBorder = px(node, 'border-left-width');
            var rightBorder = px(node, 'border-right-width');
            return node.scrollWidth + leftBorder + rightBorder;
        }

        function height(node) {
            var topBorder = px(node, 'border-top-width');
            var bottomBorder = px(node, 'border-bottom-width');
            return node.scrollHeight + topBorder + bottomBorder;
        }

        function px(node, styleProperty) {
            var value = window.getComputedStyle(node).getPropertyValue(styleProperty);
            return parseFloat(value.replace('px', ''));
        }
    }

    function newInliner() {
        var URL_REGEX = /url\(['"]?([^'"]+?)['"]?\)/g;

        return {
            inlineAll: inlineAll,
            shouldProcess: shouldProcess,
            impl: {
                readUrls: readUrls,
                inline: inline
            }
        };

        function shouldProcess(string) {
            return string.search(URL_REGEX) !== -1;
        }

        function readUrls(string) {
            var result = [];
            var match;
            while ((match = URL_REGEX.exec(string)) !== null) {
                result.push(match[1]);
            }
            return result.filter(function(url) {
                return !util.isDataUrl(url);
            });
        }

        function inline(string, url, baseUrl, get) {
            return Promise.resolve(url)
                .then(function(urlValue) {
                    return baseUrl ? util.resolveUrl(urlValue, baseUrl) : urlValue;
                })
                .then(get || util.getAndEncode)
                .then(function(data) {
                    return util.dataAsUrl(data, util.mimeType(url));
                })
                .then(function(dataUrl) {
                    return string.replace(urlAsRegex(url), '$1' + dataUrl + '$3');
                });

            function urlAsRegex(urlValue) {
                return new RegExp('(url\\([\'"]?)(' + util.escape(urlValue) + ')([\'"]?\\))', 'g');
            }
        }

        function inlineAll(string, baseUrl, get) {
            if (nothingToInline()) return Promise.resolve(string);

            return Promise.resolve(string)
                .then(readUrls)
                .then(function(urls) {
                    var done = Promise.resolve(string);
                    urls.forEach(function(url) {
                        done = done.then(function(prefix) {
                            return inline(prefix, url, baseUrl, get);
                        });
                    });
                    return done;
                });

            function nothingToInline() {
                return !shouldProcess(string);
            }
        }
    }

    function newFontFaces() {
        return {
            resolveAll: resolveAll,
            impl: {
                readAll: readAll
            }
        };

        function resolveAll() {
            return readAll()
                .then(function(webFonts) {
                    return Promise.all(
                        webFonts.map(function(webFont) {
                            return webFont.resolve();
                        })
                    );
                })
                .then(function(cssStrings) {
                    return cssStrings.join('\n');
                });
        }

        function readAll() {
            return Promise.resolve(util.asArray(document.styleSheets))
                .then(getCssRules)
                .then(selectWebFontRules)
                .then(function(rules) {
                    return rules.map(newWebFont);
                });

            function selectWebFontRules(cssRules) {
                return cssRules
                    .filter(function(rule) {
                        return rule.type === CSSRule.FONT_FACE_RULE;
                    })
                    .filter(function(rule) {
                        return inliner.shouldProcess(rule.style.getPropertyValue('src'));
                    });
            }

            function getCssRules(styleSheets) {
                var cssRules = [];
                styleSheets.forEach(function(sheet) {
                    if (Object.getPrototypeOf(sheet).hasOwnProperty("cssRules")) {
                        try {
                            util.asArray(sheet.cssRules || []).forEach(cssRules.push.bind(cssRules));
                        } catch (e) {
                            console.log('Error while reading CSS rules from ' + sheet.href, e.toString());
                        }
                    }
                });
                return cssRules;
            }

            function newWebFont(webFontRule) {
                return {
                    resolve: function resolve() {
                        var baseUrl = (webFontRule.parentStyleSheet || {}).href;
                        return inliner.inlineAll(webFontRule.cssText, baseUrl);
                    },
                    src: function() {
                        return webFontRule.style.getPropertyValue('src');
                    }
                };
            }
        }
    }

    function newImages() {
        return {
            inlineAll: inlineAll,
            impl: {
                newImage: newImage
            }
        };

        function newImage(element) {
            return {
                inline: inline
            };

            function inline(get) {
                if (util.isDataUrl(element.src)) return Promise.resolve();

                return Promise.resolve(element.src)
                    .then(get || util.getAndEncode)
                    .then(function(data) {
                        return util.dataAsUrl(data, util.mimeType(element.src));
                    })
                    .then(function(dataUrl) {
                        return new Promise(function(resolve) {
                            element.onload = resolve;
                            // for any image with invalid src(such as <img src />), just ignore it
                            element.onerror = resolve;
                            element.src = dataUrl;
                        });
                    });
            }
        }

        function inlineAll(node) {
            if (!(node instanceof Element)) return Promise.resolve(node);

            return inlineBackground(node)
                .then(function() {
                    if (node instanceof HTMLImageElement)
                        return newImage(node).inline();
                    else
                        return Promise.all(
                            util.asArray(node.childNodes).map(function(child) {
                                return inlineAll(child);
                            })
                        );
                });

            function inlineBackground(backgroudNode) {
                var background = backgroudNode.style.getPropertyValue('background');

                if (!background) return Promise.resolve(backgroudNode);

                return inliner.inlineAll(background)
                    .then(function(inlined) {
                        backgroudNode.style.setProperty(
                            'background',
                            inlined,
                            backgroud
                        );
                    })
                    .then(function() {
                        return backgroudNode;
                    });
            }
        }
    }

    function getUserComputedStyle(element, root) {
        var computedStyles = window.getComputedStyle(element);
        var inlineStyles = element.style;

        for (var i = 0; i < computedStyles.length; i++) {
            var key = computedStyles[i];
            var value = computedStyles.getPropertyValue(key);
            var inlineValue = inlineStyles.getPropertyValue(key);

            if (!inlineValue.length) {
                inlineStyles.setProperty(key, root ? 'initial' : 'unset');

                var initialValue = computedStyles.getPropertyValue(key);

                if (initialValue !== value) {
                    inlineStyles.setProperty(key, value);
                } else {
                    inlineStyles.removeProperty(key);
                }
            }
        }

        return inlineStyles;
    }
})(this);
