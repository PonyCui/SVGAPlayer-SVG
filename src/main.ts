import { Parser } from "./parser";
import { Generator } from "./generator";
import { writeFileSync } from "fs";

(async () => {
    const a = await Parser.load("/Users/saiakirahui/Documents/OpenSource/SVGAPlayer-SVG/samples/Walkthrough.svga")
    const b = new Generator(a)
    await b.process()
    writeFileSync("/Users/saiakirahui/Documents/OpenSource/SVGAPlayer-SVG/samples/Walkthrough.svg", b.toString());
})();