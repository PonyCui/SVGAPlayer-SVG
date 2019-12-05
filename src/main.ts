import { Parser } from "./parser";
import { Generator } from "./generator";
import { writeFileSync } from "fs";

(async () => {
    const a = await Parser.load("/Users/saiakirahui/Documents/OpenSource/SVGAPlayer-SVG/samples/angel.svga")
    const b = new Generator(a)
    await b.process()
    writeFileSync("/Users/saiakirahui/Documents/OpenSource/SVGAPlayer-SVG/samples/angel.svg", b.toString());
})();