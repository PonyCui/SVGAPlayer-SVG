import { VideoEntity } from "./proto/video_entity";
import { JSDOM } from "jsdom";
declare var window: any;
let jimp = typeof window !== "undefined" ? window.Jimp : require("jimp")

export interface Settings {
    backgroundColor?: string
    loopCount?: number
    fillMode?: string
}

export class Generator {

    dom = new JSDOM()
    svgElement: DocumentFragment | undefined
    spriteHasClipPath: boolean[] = []
    spritePathSame: boolean[] = []

    constructor(readonly videoItem: VideoEntity, readonly settings: Settings = {}) {
        this.svgElement = JSDOM.fragment(`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" style="background-color: ${typeof this.settings.backgroundColor === "string" ? this.settings.backgroundColor : "transparent"}" viewBox="0 0 ${videoItem.videoSize.width} ${videoItem.videoSize.height}"></svg>`)
        this.dom.window.document.body.appendChild(this.svgElement)
    }

    repeatCount(): string {
        if (this.settings.loopCount === undefined || this.settings.loopCount === 0) {
            return "indefinite"
        }
        return this.settings.loopCount.toString()
    }

    fillMode(): string {
        if (this.repeatCount() !== "indefinite") {
            if (this.settings.fillMode === "forward") {
                return " fill=\"freeze\""
            }
            if (this.settings.fillMode === "clear") {
                return " fill=\"remove\""
            }
        }
        return ""
    }

    async process() {
        await this.appendImages()
        this.appendClipPaths()
        this.appendLayers()
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
        const duration = (this.videoItem.frames / this.videoItem.FPS).toFixed(0) + "s"
        this.videoItem.sprites.forEach((it, idx) => {
            const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
            let animateLayers: { [key: string]: string[] } = {
                "opacity": [],
                "translate": [],
                "rotate": [],
                "skew": [],
                "scale": [],
            }
            if (this.spriteHasClipPath[idx] === true) {
                animateLayers["clip-path"] = []
            }
            it.frames.forEach((frameItem, frameIndex) => {
                const unmatrix = parseMatrix([frameItem.transform.a, frameItem.transform.b, frameItem.transform.c, frameItem.transform.d, frameItem.transform.tx, frameItem.transform.ty]);
                animateLayers["opacity"].push(Number(frameItem.alpha.toFixed(3)).toString())
                animateLayers["translate"].push(`${Number(unmatrix.translateX.toFixed(6)).toString()},${Number(unmatrix.translateY.toFixed(6)).toString()}`)
                animateLayers["rotate"].push(`${Number(unmatrix.rotate.toFixed(6)).toString()}`)
                animateLayers["skew"].push(`${Number(unmatrix.skew.toFixed(6)).toString()}`)
                animateLayers["scale"].push(`${Number(unmatrix.scaleX.toFixed(6)).toString()},${Number(unmatrix.scaleY.toFixed(6)).toString()}`)
                if (this.spriteHasClipPath[idx] === true) {
                    animateLayers["clip-path"].push(`url(#maskPath_${idx}_${frameIndex})`)
                }
            })
            let animateContents = ""
            for (const attrName in animateLayers) {
                if (animateLayers[attrName].length == 0) continue;
                if (animateLayers[attrName].every(it => it === animateLayers[attrName][0])) {
                    animateLayers[attrName] = [animateLayers[attrName][0]]
                }
                if (attrName == "translate" || attrName == "rotate" || attrName == "skew" || attrName == "scale") {
                    animateContents += `<animateTransform attributeName="transform" type="${attrName}" values="${animateLayers[attrName].join(";")}" dur="${duration}" additive="sum" repeatCount="${this.repeatCount()}" ${this.fillMode()} calcMode="discrete"></animateTransform>`
                }
                else {
                    animateContents += `<animate attributeName="${attrName}" values="${animateLayers[attrName].join(";")}" dur="${duration}" repeatCount="${this.repeatCount()}" ${this.fillMode()} calcMode="discrete"></animate>`
                }
            }
            if (it.imageKey != undefined && this.videoItem.images[it.imageKey] != undefined && this.svgElement !== undefined) {
                const imgElement = JSDOM.fragment(`<use id="sprite_${idx}" href="#image_${it.imageKey}" opacity="0" >${animateContents}</use>`)
                svgElement.appendChild(imgElement)
            }
            else if (it.imageKey !== undefined && it.imageKey.endsWith(".vector")) {
                let contentElement = ``
                let shapes: any = {}
                let shapeIndexMapItem: any = {}
                it.frames.forEach((frameItem, frameIndex) => {
                    frameItem.shapes.forEach((shapeItem, shapeIndex) => {
                        if (shapes[shapeIndex] === undefined) {
                            shapes[shapeIndex] = [];
                            shapeIndexMapItem[shapeIndex] = shapeItem;
                        }
                        shapes[shapeIndex][frameIndex] = shapeItem;
                    })
                })
                for (const shapeIndex in shapes) {
                    let shapeItem = shapeIndexMapItem[shapeIndex];
                    const shapeFrames = shapes[shapeIndex];
                    let animateLayers: { [key: string]: string[] } = {
                        "stroke": [],
                        "stroke-width": [],
                        "fill": [],
                        "d": [],
                        "cx": [],
                        "cy": [],
                        "rx": [],
                        "ry": [],
                        "x": [],
                        "y": [],
                        "width": [],
                        "height": [],
                        "translate": [],
                        "rotate": [],
                        "skew": [],
                        "scale": [],
                        "stroke-dasharray": [],
                    }
                    for (let index = 0; index < this.videoItem.frames; index++) {
                        let shapeFrame = shapeFrames[index];
                        if (shapeFrame === undefined || shapeFrame === null) {
                            shapeFrame = { styles: {}, shape: {} }
                        }
                        if (shapeFrame.styles.stroke !== undefined && shapeFrame.styles.stroke !== null) {
                            animateLayers["stroke"].push(`rgba(${(shapeFrame.styles.stroke[0] * 255).toFixed(0)}, ${(shapeFrame.styles.stroke[1] * 255).toFixed(0)}, ${(shapeFrame.styles.stroke[2] * 255).toFixed(0)}, ${shapeFrame.styles.stroke[3]})`)
                        }
                        else {
                            animateLayers["stroke"].push(`transparent`)
                        }
                        if (shapeFrame.styles.strokeWidth !== undefined && shapeFrame.styles.strokeWidth !== null) {
                            animateLayers["stroke-width"].push(shapeFrame.styles.strokeWidth.toString())
                        }
                        else {
                            animateLayers["stroke-width"].push(`0`)
                        }
                        if (shapeFrame.styles.fill !== undefined && shapeFrame.styles.fill !== null) {
                            animateLayers["fill"].push(`rgba(${(shapeFrame.styles.fill[0] * 255).toFixed(0)}, ${(shapeFrame.styles.fill[1] * 255).toFixed(0)}, ${(shapeFrame.styles.fill[2] * 255).toFixed(0)}, ${shapeFrame.styles.fill[3]})`)
                        }
                        else {
                            animateLayers["fill"].push(`transparent`)
                        }
                        if (shapeFrame.styles.lineDash !== undefined && shapeFrame.styles.lineDash !== null) {
                            animateLayers["stroke-dasharray"].push(shapeFrame.styles.lineDash.join(" "))
                        }
                        else {
                            animateLayers["stroke-dasharray"].push(``)
                        }
                        if (shapeFrame.shape === undefined || shapeFrame.shape === null) {
                            shapeFrame.shape = {}
                        }
                        if (shapeFrame.shape.d !== undefined && shapeFrame.shape.d !== null && shapeFrame.shape.d.trim().length > 0) {
                            animateLayers["d"].push(shapeFrame.shape.d)
                        }
                        else {
                            animateLayers["d"].push(`M 0 0`)
                        }
                        if (shapeFrame.shape.cx !== undefined && shapeFrame.shape.cx !== null) {
                            animateLayers["cx"].push(shapeFrame.shape.cx)
                        }
                        else {
                            animateLayers["cx"].push(``)
                        }
                        if (shapeFrame.shape.cy !== undefined && shapeFrame.shape.cy !== null) {
                            animateLayers["cy"].push(shapeFrame.shape.cy)
                        }
                        else {
                            animateLayers["cy"].push(``)
                        }
                        if (shapeFrame.shape.rx !== undefined && shapeFrame.shape.rx !== null) {
                            animateLayers["rx"].push(shapeFrame.shape.rx)
                        }
                        else {
                            animateLayers["rx"].push(``)
                        }
                        if (shapeFrame.shape.ry !== undefined && shapeFrame.shape.ry !== null) {
                            animateLayers["ry"].push(shapeFrame.shape.ry)
                        }
                        else {
                            animateLayers["ry"].push(``)
                        }
                        if (shapeFrame.shape.x !== undefined && shapeFrame.shape.x !== null) {
                            animateLayers["x"].push(shapeFrame.shape.x)
                        }
                        else {
                            animateLayers["x"].push(``)
                        }
                        if (shapeFrame.shape.y !== undefined && shapeFrame.shape.y !== null) {
                            animateLayers["y"].push(shapeFrame.shape.y)
                        }
                        else {
                            animateLayers["y"].push(``)
                        }
                        if (shapeFrame.shape.width !== undefined && shapeFrame.shape.width !== null) {
                            animateLayers["width"].push(shapeFrame.shape.width)
                        }
                        else {
                            animateLayers["width"].push(``)
                        }
                        if (shapeFrame.shape.height !== undefined && shapeFrame.shape.height !== null) {
                            animateLayers["height"].push(shapeFrame.shape.height)
                        }
                        else {
                            animateLayers["height"].push(``)
                        }
                        if (shapeFrame.transform !== undefined && shapeFrame.transform !== null) {
                            const unmatrix = parseMatrix([shapeFrame.transform.a, shapeFrame.transform.b, shapeFrame.transform.c, shapeFrame.transform.d, shapeFrame.transform.tx, shapeFrame.transform.ty]);
                            animateLayers["translate"].push(`${Number(unmatrix.translateX.toFixed(6)).toString()},${Number(unmatrix.translateY.toFixed(6)).toString()}`)
                            animateLayers["rotate"].push(`${Number(unmatrix.rotate.toFixed(6)).toString()}`)
                            animateLayers["skew"].push(`${Number(unmatrix.skew.toFixed(6)).toString()}`)
                            animateLayers["scale"].push(`${Number(unmatrix.scaleX.toFixed(6)).toString()},${Number(unmatrix.scaleY.toFixed(6)).toString()}`)
                        }
                        else {
                            animateLayers["translate"].push(`0,0`)
                            animateLayers["rotate"].push(`0`)
                            animateLayers["skew"].push(`0`)
                            animateLayers["scale"].push(`1,1`)
                        }
                    }
                    let animateContents2 = ""
                    for (const attrName in animateLayers) {
                        if (animateLayers[attrName].length == 0) continue;
                        const standardValues = animateLayers[attrName].filter((it) => {
                            if (attrName === "stroke" || attrName === "fill") {
                                return true
                            }
                            else if (attrName === "stroke-width") {
                                return it !== "0"
                            }
                            else {
                                return it !== ""
                            }
                        })
                        if (standardValues.every(it => it === standardValues[0])) {
                            animateLayers[attrName] = [standardValues[0]]
                        }
                        if (animateLayers[attrName].join(";") === "") continue;
                        if (attrName == "translate" || attrName == "rotate" || attrName == "skew" || attrName == "scale") {
                            animateContents2 += `<animateTransform attributeName="transform" type="${attrName}" values="${animateLayers[attrName].join(";")}" dur="${duration}" additive="sum" repeatCount="${this.repeatCount()}" ${this.fillMode()} calcMode="discrete"></animateTransform>`
                        }
                        else {
                            animateContents2 += `<animate attributeName="${attrName}" values="${animateLayers[attrName].join(";")}" dur="${duration}" repeatCount="${this.repeatCount()}" ${this.fillMode()} calcMode="discrete"></animate>`
                        }
                    }
                    if (shapeItem.type == "shape") {
                        contentElement += `<path id="sprite_${idx}_${shapeIndex}" d="${shapeItem.pathArgs.d}" stroke-linejoin="${shapeItem.styles.lineJoin}" stroke-linecap="${shapeItem.styles.lineCap}" stroke-miterlimit="${shapeItem.styles.miterLimit}">${animateContents2}</path>`
                    }
                    else if (shapeItem.type == "ellipse") {
                        contentElement += `<ellipse id="sprite_${idx}_${shapeIndex}" cx="${shapeItem.pathArgs.x}" cy="${shapeItem.pathArgs.y}" rx="${shapeItem.pathArgs.radiusX}" ry="${shapeItem.pathArgs.radiusY}" stroke-linejoin="${shapeItem.styles.lineJoin}" stroke-linecap="${shapeItem.styles.lineCap}" stroke-miterlimit="${shapeItem.styles.miterLimit}">${animateContents2}</ellipse>`
                    }
                    else if (shapeItem.type == "rect") {
                        contentElement += `<rect id="sprite_${idx}_${shapeIndex}" x="${shapeItem.pathArgs.x}" y="${shapeItem.pathArgs.y}" width="${shapeItem.pathArgs.width}" height="${shapeItem.pathArgs.height}" rx="${shapeItem.pathArgs.cornerRadius}" ry="${shapeItem.pathArgs.cornerRadius}" stroke-linejoin="${shapeItem.styles.lineJoin}" stroke-linecap="${shapeItem.styles.lineCap}" stroke-miterlimit="${shapeItem.styles.miterLimit}">${animateContents2}</rect>`
                    }
                }
                const gElement = JSDOM.fragment(`<g id="sprite_${idx}">${contentElement}${animateContents}</g>`)
                svgElement.appendChild(gElement)
            }
        })
    }

    toString() {
        return this.dom.serialize()
            .replace(`<html><head></head><body>`, '')
            .replace(`</body></html>`, '')
            .replace(/clippath/g, 'clipPath')
            .replace(/attributename/g, 'attributeName')
            .replace(/animatetransform/g, 'animateTransform')
            .replace(/repeatcount/g, 'repeatCount')
            .replace(/calcmode/g, 'calcMode')
            .replace(/svg_/ig, '')
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