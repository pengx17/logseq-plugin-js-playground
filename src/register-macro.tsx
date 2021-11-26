import React from "react";
import ReactDOMServer from "react-dom/server";
import { loadCode } from "./load-code";

window.React = React;

const macroPrefix = ":jsplay";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const rendering = new Map<string, string>();

export const registerMacro = () => {
  logseq.App.onMacroRendererSlotted(async ({ payload, slot }) => {
    const uuid = payload.uuid;
    const [type] = payload.arguments;
    if (!type?.startsWith(macroPrefix)) {
      return;
    }

    
    rendering.set(uuid, slot);

    const render = async () => {
      try {
        if (rendering.get(uuid) !== slot) {
          return;
        }
        const code = await loadCode(uuid);
        const result = await eval(code);
        const template = ReactDOMServer.renderToStaticMarkup(result);

        if (rendering.get(uuid) !== slot) {
          return;
        }

        logseq.provideUI({
          key: "js-playground",
          slot,
          reset: true,
          template: template,
        });
      } catch {
        // skip invalid
      }
      setTimeout(render, 1000);
    };
    render();
  });

  // This command only support to replace the whole block
  logseq.Editor.registerSlashCommand("Add <JSPlay /> Block", async () => {
    const newContent = `{{renderer ${macroPrefix}}}`;
    const block = await logseq.Editor.getCurrentBlock();
    if (block) {
      logseq.Editor.updateBlock(block.uuid, newContent);
    }
  });
};
