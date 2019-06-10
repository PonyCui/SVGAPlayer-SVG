import { VideoEntity } from "./proto/video_entity";
import { JSDOM } from "jsdom";
import * as jimp from "jimp";

export class Generator {

    dom = new JSDOM()
    svgElement: DocumentFragment | undefined

    constructor(readonly videoItem: VideoEntity) {
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
            defsContents += `<svg_image id="image_${imageKey}" href="data:image/png;base64,${Buffer.from(value).toString("base64")}" width="${jimpObject.getWidth().toFixed(0)}" height="${jimpObject.getHeight().toFixed(0)}"></svg_image>`
        }
        const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
        svgElement.appendChild(JSDOM.fragment(`<defs>${defsContents}</defs>`))
    }

    appendLayers() {
        this.videoItem.sprites.forEach((it, idx) => {
            const svgElement = this.dom.window.document.getElementsByTagName("svg")[0]
            if (it.imageKey != undefined && this.videoItem.images[it.imageKey] != undefined && this.svgElement !== undefined) {
                const imgElement = JSDOM.fragment(`<use id="sprite_${idx}" href="#image_${it.imageKey}" style="opacity:0.0" />`)
                svgElement.appendChild(imgElement)
            }
        })
    }

    appendCSS() {
        let cssContent = '';
        this.videoItem.sprites.forEach((spriteItem, spriteIndex) => {
            let animationContent = `#sprite_${spriteIndex} { animation: sprite_${spriteIndex}_animation ${(this.videoItem.frames / this.videoItem.FPS).toFixed(2)}s infinite step-start forwards}`;
            let keyframesContent = ``;
            spriteItem.frames.forEach((frameItem, frameIndex) => {
                keyframesContent += `${((frameIndex / this.videoItem.frames) * 100).toFixed(0)}% { opacity: ${frameItem.alpha}; transform: matrix(${frameItem.transform.a},${frameItem.transform.b},${frameItem.transform.c},${frameItem.transform.d},${frameItem.transform.tx},${frameItem.transform.ty}); }`
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