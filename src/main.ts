import "@logseq/libs";

import { logseq as PL } from "../package.json";
import { registerMacro } from "./register-macro";

const magicKey = `__${PL.id}__loaded__`;

function main() {
  const pluginId = logseq.baseInfo.id;
  console.info(`#${pluginId}: MAIN`);

  // @ts-expect-error
  top[magicKey] = true;

  registerMacro();
}

// @ts-expect-error
if (top[magicKey]) {
  // Reload Not working properly
  logseq.App.relaunch().then(main).catch(console.error);
} else {
  logseq.ready(main).catch(console.error);
}
