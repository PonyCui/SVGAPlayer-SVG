import { readFileSync } from "fs";
import { ProtoMovieEntity } from "./proto/proto";
import { VideoEntity } from "./proto/video_entity";
const pako = require("pako")

export class Parser {

    static async load(fsPath: string): Promise<VideoEntity> {
        const buffer = readFileSync(fsPath)
        const inflatedData = pako.inflate(buffer)
        const movieData = ProtoMovieEntity.decode(inflatedData)
        return new VideoEntity(movieData)
    }

}