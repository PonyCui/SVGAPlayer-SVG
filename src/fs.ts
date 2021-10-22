import { Parser } from "./parser";
import { Generator } from "./generator";
import * as fs from "fs"

export const transformFile = async (fsPath: string): Promise<string> => {
    const source = await Parser.load(fsPath)
    const generator = new Generator(source, {
        backgroundColor: "black",
        // loopCount: 2,
        // fillMode: "clear",
    })
    await generator.process()
    return generator.toString()
}

transformFile("samples/rose.svga").then((result) => {
    fs.writeFileSync("samples/rose.svg", result)
})
