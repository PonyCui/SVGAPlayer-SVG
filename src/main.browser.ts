import { Parser } from "./parser";
import { Generator, Settings } from "./generator.browser";

export const transformFile = async (file: File, settings: Settings): Promise<string> => {
  const source = await Parser.loadFile(file);
  const generator = new Generator(source, settings);
  await generator.process();
  return generator.toString();
};
