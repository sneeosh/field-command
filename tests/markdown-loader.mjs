import { readFile } from "node:fs/promises";
export async function resolve(specifier,context,nextResolve){
  if(specifier.endsWith(".md?raw"))return {url:new URL(specifier,context.parentURL).href,shortCircuit:true};
  return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
  if(url.endsWith(".md?raw")){const file=new URL(url);file.search="";return {format:"module",source:`export default ${JSON.stringify(await readFile(file,"utf8"))};`,shortCircuit:true};}
  return nextLoad(url,context);
}
