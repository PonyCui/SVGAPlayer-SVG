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

    static async loadFile(file: File): Promise<VideoEntity> {
        return new Promise((res, rej) => {
            const reader = new FileReader
            reader.onloadend = () => {
                if (reader.result) {
                    const buffer = reader.result
                    const inflatedData = pako.inflate(buffer)
                    const movieData = ProtoMovieEntity.decode(inflatedData)
                    res(new VideoEntity(movieData))
                }
                else {
                    rej("Load failed.")
                }
            }
            reader.onerror = () => {
                rej("Load failed.")
            }
            reader.readAsArrayBuffer(file)
        })

    }

}