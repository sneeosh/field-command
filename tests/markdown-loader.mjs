import { readFile } from "node:fs/promises";
export async function resolve(specifier,context,nextResolve){
  if(specifier.endsWith(".md?raw"))return {url:new URL(specifier,context.parentURL).href,shortCircuit:true};
  if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)){
    for(const suffix of ['.ts','.tsx'])try{return await nextResolve(specifier+suffix,context)}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error}
  }
  return nextResolve(specifier,context);
}
export async function load(url,context,nextLoad){
  if(url.endsWith('.tsx')){
    const ts=await import('typescript');
    const source=await readFile(new URL(url),'utf8');
    return {format:'module',source:ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};
  }
  if(url.endsWith(".md?raw")){const file=new URL(url);file.search="";return {format:"module",source:`export default ${JSON.stringify(await readFile(file,"utf8"))};`,shortCircuit:true};}
  return nextLoad(url,context);
}
