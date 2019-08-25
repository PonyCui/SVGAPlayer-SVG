import { VideoEntity } from "./proto/video_entity";
import { JSDOM } from "jsdom";
import * as jimp from "jimp";
import { FrameEntity } from "./proto/frame_entity";

export class Generator {

    dom = new JSDOM()
    svgElement: DocumentFragment | undefined
    spriteHasClipPath: boolean[] = []

    constructor(readonly videoItem: VideoEntity, readonly loops: number = 0) {
        this.svgElement = JSDOM.fragment(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" style="background-color: black" viewBox="0 0 ${videoItem.videoSize.width} ${videoItem.videoSize.height}"></svg>`)
        this.dom.window.document.body.appendChild(this.svgElement)
    }

    async process() {
        await this.appendImages()
        this.appendClipPaths()
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

    appendClipPaths() {
        let defsContents = ''
        this.videoItem.sprites.forEach((spriteItem, spriteIndex) => {
            let hasClipPath = false
            spriteItem.frames.forEach((frameItem, frameIndex) => {
                if (frameItem.maskPath !== undefined) {
                    hasClipPath = true
                    const d = frameItem.maskPath._d.replace(/([0-9]+)\.([0-9][0-9][0-9])[0-9]+/g, '$1\.$2')
                    defsContents += `<clipPath id="maskPath_${spriteIndex}_${frameIndex}"><path d="${d}" style="fill:#000000;"></path></clipPath>`
                }
            })
            this.spriteHasClipPath.push(hasClipPath)
        })
        const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
        svgElement.appendChild(JSDOM.fragment(`<defs>${defsContents}</defs>`))
    }

    appendLayers() {
        this.videoItem.sprites.forEach((it, idx) => {
            const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
            if (it.imageKey != undefined && this.videoItem.images[it.imageKey] != undefined && this.svgElement !== undefined) {
                if (this.spriteHasClipPath[idx] === true) {
                    it.frames.forEach((_, frameIndex) => {
                        const imgElement = JSDOM.fragment(`<use id="sprite_${idx}_${frameIndex}" href="#image_${it.imageKey}" style="opacity:0.0; will-change: transform, opacity; clip-path: url(#maskPath_${idx}_${frameIndex});" />`)
                        svgElement.appendChild(imgElement)
                    })
                }
                else {
                    const imgElement = JSDOM.fragment(`<use id="sprite_${idx}" href="#image_${it.imageKey}" style="opacity:0.0; will-change: transform, opacity;" />`)
                    svgElement.appendChild(imgElement)
                }
            }
        })
    }

    appendCSS() {
        let cssContent = '';
        this.videoItem.sprites.forEach((spriteItem, spriteIndex) => {
            if (this.spriteHasClipPath[spriteIndex] === true) {
                spriteItem.frames.forEach((frameItem, frameIndex) => {
                    let animationContent = `#sprite_${spriteIndex}_${frameIndex} { animation: sprite_${spriteIndex}_${frameIndex}_animation ${(this.videoItem.frames / this.videoItem.FPS).toFixed(2)}s ${this.loops > 0 ? this.loops.toFixed(0) : 'infinite'} step-start forwards}`;
                    let keyframesContent = ``;
                    for (let currentIndex = 0; currentIndex < this.videoItem.frames; currentIndex++) {
                        if (currentIndex < frameIndex) {
                            if (currentIndex == 0) {
                                keyframesContent += `0% { opacity: 0; }`
                            }
                            else if (currentIndex == frameIndex -1) {
                                keyframesContent += `${((currentIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: 0; }`
                            }
                            continue
                        }
                        if (frameItem.alpha <= 0.0 || currentIndex > frameIndex) {
                            keyframesContent += `${((currentIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: 0; }`
                            break
                        }
                        const unmatrix = parseMatrix([frameItem.transform.a, frameItem.transform.b, frameItem.transform.c, frameItem.transform.d, frameItem.transform.tx, frameItem.transform.ty]);
                        keyframesContent += `${((currentIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: ${Number(frameItem.alpha.toFixed(3)).toString()}; transform: translate(${Number(unmatrix.translateX.toFixed(6)).toString()}px, ${Number(unmatrix.translateY.toFixed(6)).toString()}px) rotate(${Number(unmatrix.rotate.toFixed(6)).toString()}deg) skew(${Number(unmatrix.skew.toFixed(6)).toString()}deg) scale(${Number(unmatrix.scaleX.toFixed(6)).toString()}, ${Number(unmatrix.scaleY.toFixed(6)).toString()}); }`
                    }
                    animationContent += `@keyframes sprite_${spriteIndex}_${frameIndex}_animation { ${keyframesContent} }`
                    cssContent += animationContent;
                })
            }
            else {
                let animationContent = `#sprite_${spriteIndex} { animation: sprite_${spriteIndex}_animation ${(this.videoItem.frames / this.videoItem.FPS).toFixed(2)}s ${this.loops > 0 ? this.loops.toFixed(0) : 'infinite'} step-start forwards}`;
                let keyframesContent = ``;
                spriteItem.frames.forEach((frameItem, frameIndex) => {
                    if (frameItem.alpha <= 0.0) {
                        keyframesContent += `${((frameIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: 0; }`
                        return;
                    }
                    const unmatrix = parseMatrix([frameItem.transform.a, frameItem.transform.b, frameItem.transform.c, frameItem.transform.d, frameItem.transform.tx, frameItem.transform.ty]);
                    keyframesContent += `${((frameIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: ${Number(frameItem.alpha.toFixed(3)).toString()}; transform: translate(${Number(unmatrix.translateX.toFixed(6)).toString()}px, ${Number(unmatrix.translateY.toFixed(6)).toString()}px) rotate(${Number(unmatrix.rotate.toFixed(6)).toString()}deg) skew(${Number(unmatrix.skew.toFixed(6)).toString()}deg) scale(${Number(unmatrix.scaleX.toFixed(6)).toString()}, ${Number(unmatrix.scaleY.toFixed(6)).toString()}); }`
                })
                animationContent += `@keyframes sprite_${spriteIndex}_animation { ${keyframesContent} }`
                cssContent += animationContent;
            }
        })
        const cssElement = JSDOM.fragment(`<style>${cssContent}</style>`)
        const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
        svgElement.appendChild(cssElement)
    }

    toString() {
        return this.dom.serialize().replace(`<html><head></head><body>`, '').replace(`</body></html>`, '').replace(/clippath/g, 'clipPath').replace(/svg_/ig, '')
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