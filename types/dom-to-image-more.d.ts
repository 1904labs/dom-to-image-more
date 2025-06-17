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
 * @param {Number} options.scale - a Number multiplier to scale up the canvas before rendering to reduce fuzzy images, defaults to 1.0.
 * @param {String} options.imagePlaceholder - dataURL to use as a placeholder for failed images, default behaviour is to fail fast on images we can't fetch
 * @param {Boolean} options.cacheBust - set to true to cache bust by appending the time to the request url
 * @param {String} options.styleCaching - set to 'strict', 'relaxed' to select style caching rules
 * @param {Boolean} options.copyDefaultStyles - set to false to disable use of default styles of elements
 * @param {Boolean} options.disableEmbedFonts - set to true to disable font embedding into the SVG output.
 * @param {Object} options.corsImg - When the image is restricted by the server from cross-domain requests, the proxy address is passed in to get the image
 *         - @param {String} url - eg: https://cors-anywhere.herokuapp.com/
 *         - @param {Enumerator} method - get, post
 *         - @param {Object} headers - eg: { "Content-Type", "application/json;charset=UTF-8" }
 *         - @param {Object} data - post payload
 * @param {Function} options.adjustClonedNode - callback for adjustClonedNode eventing (to allow adjusting clone's properties)
 * @param {Function} options.filterStyles - Should return true if passed propertyName should be included in the output
 * @return {Promise} - A promise that is fulfilled with a SVG image data URL
 * */
export function toSvg(node: Node, options: {
    filter: Function;
    onclone: Function;
    bgcolor: string;
    width: number;
    height: number;
    style: any;
    quality: number;
    scale: number;
    imagePlaceholder: string;
    cacheBust: boolean;
    styleCaching: string;
    copyDefaultStyles: boolean;
    disableEmbedFonts: boolean;
    corsImg: any;
}): Promise<any>;
/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image data URL
 * */
export function toPng(node: Node, options: any): Promise<any>;
/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a JPEG image data URL
 * */
export function toJpeg(node: Node, options: any): Promise<any>;
/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a PNG image blob
 * */
export function toBlob(node: Node, options: any): Promise<any>;
/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a Uint8Array containing RGBA pixel data.
 * */
export function toPixelData(node: Node, options: any): Promise<any>;
/**
 * @param {Node} node - The DOM Node object to render
 * @param {Object} options - Rendering options, @see {@link toSvg}
 * @return {Promise} - A promise that is fulfilled with a canvas object
 * */
export function toCanvas(node: Node, options: any): Promise<any>;
declare namespace fontFaces {
    export { resolveAll };
    export namespace impl_1 {
        export { readAll };
    }
    export { impl_1 as impl };
}
declare namespace images {
    export { inlineAll };
    export namespace impl_2 {
        export { newImage };
    }
    export { impl_2 as impl };
}
declare namespace util {
    export { escapeRegEx as escape };
    export { isDataUrl };
    export { canvasToBlob };
    export { resolveUrl };
    export { getAndEncode };
    export { uid };
    export { delay };
    export { asArray };
    export { escapeXhtml };
    export { makeImage };
    export { width };
    export { height };
    export { getWindow };
    export { isElement };
    export { isElementHostForOpenShadowRoot };
    export { isShadowRoot };
    export { isInShadowRoot };
    export { isHTMLElement };
    export { isHTMLCanvasElement };
    export { isHTMLInputElement };
    export { isHTMLImageElement };
    export { isHTMLLinkElement };
    export { isHTMLScriptElement };
    export { isHTMLStyleElement };
    export { isHTMLTextAreaElement };
    export { isShadowSlotElement };
    export { isSVGElement };
    export { isSVGRectElement };
    export { isDimensionMissing };
}
declare namespace inliner {
    export { inlineAll };
    export { shouldProcess };
    export namespace impl_3 {
        export { readUrls };
        export { inline };
        export { urlAsRegex };
    }
    export { impl_3 as impl };
}
declare function resolveAll(): Promise<string>;
declare function readAll(): Promise<any>;
declare function inlineAll(node: any): any;
declare function newImage(element: any): {
    inline: (get: any) => Promise<any>;
};
declare function escapeRegEx(string: any): any;
declare function isDataUrl(url: any): boolean;
declare function canvasToBlob(canvas: any): Promise<any>;
declare function resolveUrl(url: any, baseUrl: any): string;
declare function getAndEncode(url: any): any;
declare function uid(): string;
declare function delay(ms: any): (arg: any) => Promise<any>;
declare function asArray(arrayLike: any): any[];
declare function escapeXhtml(string: any): any;
declare function makeImage(uri: any): Promise<any>;
declare function width(node: any): any;
declare function height(node: any): any;
declare function getWindow(node: any): any;
declare function isElement(value: any): boolean;
declare function isElementHostForOpenShadowRoot(value: any): boolean;
declare function isShadowRoot(value: any): boolean;
declare function isInShadowRoot(value: any): boolean;
declare function isHTMLElement(value: any): boolean;
declare function isHTMLCanvasElement(value: any): boolean;
declare function isHTMLInputElement(value: any): boolean;
declare function isHTMLImageElement(value: any): boolean;
declare function isHTMLLinkElement(value: any): boolean;
declare function isHTMLScriptElement(value: any): boolean;
declare function isHTMLStyleElement(value: any): boolean;
declare function isHTMLTextAreaElement(value: any): boolean;
declare function isShadowSlotElement(value: any): boolean;
declare function isSVGElement(value: any): boolean;
declare function isSVGRectElement(value: any): boolean;
declare function isDimensionMissing(value: any): boolean;
declare function inlineAll_1(string: any, baseUrl: any, get: any): Promise<any>;
declare function shouldProcess(string: any): boolean;
declare function readUrls(string: any): string[];
declare function inline(string: any, url: any, baseUrl: any, get: any): Promise<any>;
declare function urlAsRegex(urlValue: any): RegExp;
export declare namespace impl {
    export { fontFaces };
    export { images };
    export { util };
    export { inliner };
    export let urlCache: any[];
    export let options: {};
}
export {};
