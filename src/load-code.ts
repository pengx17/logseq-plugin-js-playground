import {
  BlockEntity,
  BlockUUIDTuple,
  PageEntity,
} from "@logseq/libs/dist/LSPlugin.user";
import * as esbuild from "esbuild-wasm";
import esbuildWasmUrl from "esbuild-wasm/esbuild.wasm?url";

let _init: Promise<void> | null = null;

const transform = async (code: string) => {
  if (!_init) {
    _init = esbuild.initialize({
      wasmURL: esbuildWasmUrl,
    });
  }
  await _init;
  return await esbuild.transform(code, { loader: 'tsx', });
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

  const codes = (block?.children ?? [])
    .filter(isBlockEntity)
    .flatMap((b) => b.body)
    .filter((pair) => pair[0] === "Src")
    .flatMap((pair) => pair[1].lines)
    .join("");

  return (await transform(codes)).code;
};
