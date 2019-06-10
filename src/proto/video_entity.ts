import { SpriteEntity } from './sprite_entity'
const { ProtoMovieEntity } = require("./proto")

export class VideoEntity {

    /**
     * SVGA 文件版本
     */
    version: string = "";

    /**
     * 影片尺寸
     */
    videoSize = {
        width: 0.0,
        height: 0.0,
    };

    /**
     * 帧率
     */
    FPS: number = 20;

    /**
     * 帧数
     */
    frames: number = 0;

    /**
     * Bitmaps
     */
    images: { [key: string]: Uint8Array } = {};

    /**
     * SpriteEntity[]
     */
    sprites: SpriteEntity[] = []

    constructor(spec: typeof ProtoMovieEntity) {
        if (typeof spec.params === "object") {
            this.version = spec.ver;
            this.videoSize.width = spec.params.viewBoxWidth || 0.0;
            this.videoSize.height = spec.params.viewBoxHeight || 0.0;
            this.FPS = spec.params.fps || 20;
            this.frames = spec.params.frames || 0;
        }
        this.resetSprites(spec)
        this.images = spec.images
    }

    resetSprites(spec: typeof ProtoMovieEntity) {
        if (spec.sprites instanceof Array) {
            this.sprites = spec.sprites.map((obj: any) => {
                return new SpriteEntity(obj)
            })
        }
    }

}