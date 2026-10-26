import { readField, withField } from "../manuscript/sceneFile.js";

// A note's other names are `aliases: [Eken, Kommissarien]` in its front matter, as the writer's
// other tools write them. A list without brackets, `aliases: Eken, Kommissarien`, is read too.

const unquoted = (name: string) =>
  name
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();

/** The aliases in a note's front matter, in order, none twice. */
export function aliasesOf(frontMatter: string): string[] {
  const list = (readField(frontMatter, "aliases") ?? "").replace(/^\[(.*)\]$/, "$1");
  const names = list
    .split(",")
    .map(unquoted)
    .filter((name) => name !== "");
  return [...new Set(names)];
}

/** A comma would split a name in two, so it is written as a space. */
const cleaned = (name: string) =>
  name
    .replace(/[,[\]"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The front matter with these aliases, or without the line when there are none. */
export function withAliases(frontMatter: string, aliases: string[]): string {
  const names = [...new Set(aliases.map(cleaned).filter((name) => name !== ""))];
  if (names.length > 0) return withField(frontMatter, "aliases", `[${names.join(", ")}]`);
  return frontMatter.replace(/^aliases:.*(\r?\n)/m, "");
}
