import { useState } from "react";
import { useEditorState } from "../editor/editorStore.js";
import { isAskingForLink, linkTarget, setLink, stopAskingForLink } from "../editor/linkEditing.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { t } from "../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

function LinkForm({ editor, href }: { editor: Editor; href: string }) {
  const [address, setAddress] = useState(href);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        editor.run(setLink(address));
      }}
    >
      <input
        autoFocus
        inputMode="url"
        aria-label={t("Länkens adress")}
        placeholder={t("Webbadress eller e-post")}
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          editor.run(stopAskingForLink);
        }}
      />
      <LinkActions editor={editor} isLink={href !== ""} />
    </form>
  );
}

function LinkActions({ editor, isLink }: { editor: Editor; isLink: boolean }) {
  return (
    <div className="footnote-actions">
      {isLink && (
        <button type="button" className="link-button" onClick={() => editor.run(setLink(""))}>
          {t("Ta bort")}
        </button>
      )}
      <button type="submit" className="button primary small">
        {t("Klar")}
      </button>
    </div>
  );
}

/** Länk…: the address of the selected text, or of the link the cursor stands in. */
export function LinkPopover({ editor }: { editor: Editor }) {
  const view = editor.viewRef.current;
  const state = useEditorState(editor);
  if (!view || !state || !isAskingForLink(state)) return null;
  const target = linkTarget(state);
  const top = view.coordsAtPos(target.to).bottom + 8;
  return (
    <div className="link-popover" style={{ top }} role="dialog" aria-label={t("Länk")}>
      <LinkForm key={`${target.from}-${target.href}`} editor={editor} href={target.href} />
    </div>
  );
}
