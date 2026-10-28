import { useCallback, useEffect, useState } from "react";
import {
  parseTemplate,
  readOwnTemplates,
  saveOwnTemplate,
  OWN_PREFIX,
} from "../../project/ownTemplates.js";
import type { BookTemplate } from "../../project/templates.js";
import { libraryOf } from "../libraryFolder.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// The writer's own templates, as files in the Skrivro folder: read, imported and shared.

const TEMPLATE_FILE = { name: t("Skrivro-mall"), extensions: ["json"] };

export function useOwnTemplates(libraryDir: string | null) {
  const [own, setOwn] = useState<BookTemplate[]>([]);
  const reload = useCallback(async () => {
    setOwn(await readOwnTemplates(platform.fileSystem, await libraryOf(libraryDir)));
  }, [libraryDir]);
  useEffect(() => void reload().catch(() => setOwn([])), [reload]);
  return { own, reload };
}

/** A template file someone shared, kept in the Skrivro folder; null when it is not a template. */
export async function importTemplateFile(libraryDir: string | null) {
  const picked = await platform.pickFile(TEMPLATE_FILE);
  if (!picked) return null;
  const template = parseTemplate(new TextDecoder().decode(picked.bytes), OWN_PREFIX);
  if (!template) throw new Error(t("Filen är ingen Skrivro-mall."));
  await saveOwnTemplate(platform.fileSystem, await libraryOf(libraryDir), template);
  return template;
}

/** The template as a file to send to someone else. */
export async function shareTemplateFile(template: BookTemplate) {
  const text = `${JSON.stringify({ ...template, id: undefined }, null, 2)}\n`;
  const kind = { name: TEMPLATE_FILE.name, extension: "json" };
  await platform.saveFile(`${template.name}.json`, new TextEncoder().encode(text), kind);
}
