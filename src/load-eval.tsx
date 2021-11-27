import React from "react";
import ReactDOMServer from "react-dom/server";

import {
  BlockEntity,
  BlockUUIDTuple,
  PageEntity,
} from "@logseq/libs/dist/LSPlugin.user";
import * as esbuild from "esbuild-wasm";
import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";

// Makes sure eval can be successfully called
window.React = React;
let _init: Promise<void> | null = null;

export const initEsbuild = async () => {
  if (!_init) {
    _init = esbuild.initialize({
      wasmURL: esbuildWasmUrl,
    });
  }
  await _init;
};

const transform = async (code: string, isTsx: boolean) => {
  await initEsbuild();
  return await esbuild.transform(code, { loader: isTsx ? "tsx" : "ts" });
};

function isBlockEntity(
  maybeBlockEntity: BlockEntity | BlockUUIDTuple | PageEntity
): maybeBlockEntity is BlockEntity {
  // PageEntity does not have "page" property
  return "page" in maybeBlockEntity;
}

export const loadCode = async (blockId: string) => {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });

  const codes: [lang: string, code: string][] = (block?.children ?? [])
    .filter(isBlockEntity)
    .flatMap((b) => b.body)
    .filter((pair) => pair[0] === "Src")
    .map((pair) => [pair[1].language ?? "ts", pair[1].lines.join("")]);

  const hasJsx = codes.some(([lang]) => ["tsx", "jsx"].includes(lang));
  const { code } = await transform(
    codes.map(([_, code]) => code).join(""),
    hasJsx
  );
  return [code, hasJsx] as const;
};

// Eval does not support ESM `import`
// See https://2ality.com/2019/10/eval-via-import.html
// We want to support ESM import to load some cool utilites like
// https://www.skypack.dev/view/vega-lite
// import vegaLite from 'https://cdn.skypack.dev/vega-lite';
const evalCode = async (code: string) => {
  const encodedJs = encodeURIComponent(code);
  const dataUri = "data:text/javascript;charset=utf-8," + encodedJs;
  return import( /* @vite-ignore */ dataUri).then((m) => m.default);
};

export const loadAndEval = async (blockId: string) => {
  const [code, hasJsx] = await loadCode(blockId);
  console.log("=== Transformed Code === \n" + code);
  const result = await evalCode(code);
  if (hasJsx) {
    return ReactDOMServer.renderToStaticMarkup(result);
  }
  return result;
};
