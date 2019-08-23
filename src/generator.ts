import { VideoEntity } from "./proto/video_entity";
import { JSDOM } from "jsdom";
import * as jimp from "jimp";

export class Generator {

    dom = new JSDOM()
    svgElement: DocumentFragment | undefined

    constructor(readonly videoItem: VideoEntity, readonly loops: number = 0) {
        this.svgElement = JSDOM.fragment(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" style="background-color: black" viewBox="0 0 ${videoItem.videoSize.width} ${videoItem.videoSize.height}"></svg>`)
        this.dom.window.document.body.appendChild(this.svgElement)
    }

    async process() {
        await this.appendImages()
        this.appendLayers()
        this.appendCSS()
    }

    async appendImages() {
        let defsContents = ''
        for (const imageKey in this.videoItem.images) {
            const value = this.videoItem.images[imageKey];
            const jimpObject = await jimp.read(Buffer.from(value))
            defsContents += `<svg_image id="image_${imageKey}" href="data:image/png;base64,${Buffer.from(value).toString("base64")}" width="${(jimpObject.getWidth()).toFixed(0)}" height="${jimpObject.getHeight().toFixed(0)}"></svg_image>`
        }
        const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
        svgElement.appendChild(JSDOM.fragment(`<defs>${defsContents}</defs>`))
    }

    appendLayers() {
        this.videoItem.sprites.forEach((it, idx) => {
            const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
            if (it.imageKey != undefined && this.videoItem.images[it.imageKey] != undefined && this.svgElement !== undefined) {
                const imgElement = JSDOM.fragment(`<use id="sprite_${idx}" href="#image_${it.imageKey}" style="opacity:0.0; will-change: transform, opacity;" />`)
                svgElement.appendChild(imgElement)
            }
        })
    }

    appendCSS() {
        let cssContent = '';
        this.videoItem.sprites.forEach((spriteItem, spriteIndex) => {
            let animationContent = `#sprite_${spriteIndex} { animation: sprite_${spriteIndex}_animation ${(this.videoItem.frames / this.videoItem.FPS).toFixed(2)}s ${this.loops > 0 ? this.loops.toFixed(0) : 'infinite'} step-start forwards}`;
            let keyframesContent = ``;
            spriteItem.frames.forEach((frameItem, frameIndex) => {
                const unmatrix = parseMatrix([frameItem.transform.a, frameItem.transform.b, frameItem.transform.c, frameItem.transform.d, frameItem.transform.tx, frameItem.transform.ty]);
                keyframesContent += `${((frameIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: ${frameItem.alpha}; transform: translate(${unmatrix.translateX}px, ${unmatrix.translateY}px) rotate(${unmatrix.rotate}deg) skew(${unmatrix.skew}deg) scale(${unmatrix.scaleX}, ${unmatrix.scaleY}); }`
            })
            animationContent += `@keyframes sprite_${spriteIndex}_animation { ${keyframesContent} }`
            cssContent += animationContent;
        })
        const cssElement = JSDOM.fragment(`<style>${cssContent}</style>`)
        const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
        svgElement.appendChild(cssElement)
    }

    toString() {
        return this.dom.serialize().replace(`<html><head></head><body>`, '').replace(`</body></html>`, '').replace(/svg_/ig, '')
    }

}

/**
 * Unmatrix: parse the values of the matrix
 *
 * Algorithm from:
 *
 * - http://hg.mozilla.org/mozilla-central/file/7cb3e9795d04/layout/style/nsStyleAnimation.cpp
 *
 * @param {String} str
 * @return {Object}
 * @api public
 */

function parseMatrix(matrix: number[]) {
    var m = matrix;
    var A = m[0];
    var B = m[1];
    var C = m[2];
    var D = m[3];

    // if (A * D == B * C) throw new Error('transform#unmatrix: matrix is singular');

    // step (3)
    var scaleX = Math.sqrt(A * A + B * B);
    A /= scaleX;
    B /= scaleX;

    // step (4)
    var skew = A * C + B * D;
    C -= A * skew;
    D -= B * skew;

    // step (5)
    var scaleY = Math.sqrt(C * C + D * D);
    C /= scaleY;
    D /= scaleY;
    skew /= scaleY;

    // step (6)
    if (A * D < B * C) {
        A = -A;
        B = -B;
        skew = -skew;
        scaleX = -scaleX;
    }

    return {
        translateX: m[4],
        translateY: m[5],
        rotate: rtod(Math.atan2(B, A)),
        skew: rtod(Math.atan(skew)),
        scaleX: round(scaleX),
        scaleY: round(scaleY)
    };
};

/**
 * Radians to degrees
 *
 * @param {Number} radians
 * @return {Number} degrees
 * @api private
 */

function rtod(radians: number) {
    var deg = radians * 180 / Math.PI;
    return round(deg);
}

/**
 * Round to the nearest hundredth
 *
 * @param {Number} n
 * @return {Number}
 * @api private
 */

function round(n: number) {
    return Math.round(n * 100) / 100;
}