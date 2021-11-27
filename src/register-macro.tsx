import { initEsbuild, loadAndEval } from "./load-eval";

const macroPrefix = ":jsplay";

// @ts-expect-error
const css = (t, ...args) => String.raw(t, ...args);

const rendering = new Map<string, string>();

const wrapTemplate = (template: string) => {
  return `<div style="border: 2px solid #000; padding: 0 1em; cursor: default">${template}</div>`;
};

export const registerMacro = () => {
  initEsbuild();
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
        let template = await loadAndEval(uuid);

        if (rendering.get(uuid) !== slot) {
          return;
        }

        logseq.provideUI({
          key: "js-playground",
          slot,
          reset: true,
          template: wrapTemplate(template),
        });
      } catch (err: any) {
        console.error(err);
        logseq.provideUI({
          key: "js-playground",
          slot,
          reset: true,
          template: wrapTemplate(
            `<span style="color: red">${err.message}</span>`
          ),
        });
        // skip invalid
      }
    };
    render();
  });

  // This command only support to replace the whole block
  logseq.Editor.registerSlashCommand("Add <JSPlay /> Block", async () => {
    const newContent = `{{renderer ${macroPrefix}}}`;
    const block = await logseq.Editor.getCurrentBlock();
    if (block) {
      await logseq.Editor.updateBlock(block.uuid, newContent);
      const codeBlock = await logseq.Editor.insertBlock(
        block.uuid,
        `\`\`\`ts\n export default "Hello World!" \n\`\`\``
      );
      if (codeBlock) {
        await logseq.Editor.moveBlock(codeBlock.uuid, block.uuid, {
          children: true,
        });
        logseq.Editor.exitEditingMode();
      }
    }
  });
};
