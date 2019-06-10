import { FrameEntity } from './frame_entity'
import { ProtoMovieEntity } from './proto';

export class SpriteEntity {

    /**
     * string
     */
    imageKey: string | undefined = undefined

    /**
     * FrameEntity[]
     */
    frames: FrameEntity[] = []

    constructor(spec: typeof ProtoMovieEntity) {
        this.imageKey = spec.imageKey;
        if (spec.frames) {
            this.frames = spec.frames.map((obj: any) => {
                return new FrameEntity(obj)
            })
        }
    }

}

export class BezierPath {

    _d: any;
    _transform: any;
    _styles: any;
    _shape: any;

    constructor(d: any, transform: any, styles: any) {
        this._d = d;
        this._transform = transform;
        this._styles = styles;
    }

}


export class EllipsePath extends BezierPath {

    _x: number;
    _y: number;
    _radiusX: number;
    _radiusY: number;
    _transform: any;
    _styles: any;

    constructor(x: number, y: number, radiusX: number, radiusY: number, transform: any, styles: any) {
        super(undefined, undefined, undefined);
        this._x = x;
        this._y = y;
        this._radiusX = radiusX;
        this._radiusY = radiusY;
        this._transform = transform;
        this._styles = styles;
    }

}


export class RectPath extends BezierPath {

    _x: number;
    _y: number;
    _width: number;
    _height: number;
    _cornerRadius: number;
    _transform: any;
    _styles: any;

    constructor(x: number, y: number, width: number, height: number, cornerRadius: number, transform: any, styles: any) {
        super(undefined, undefined, undefined);
        this._x = x
        this._y = y
        this._width = width
        this._height = height
        this._cornerRadius = cornerRadius
        this._transform = transform
        this._styles = styles
    }

}