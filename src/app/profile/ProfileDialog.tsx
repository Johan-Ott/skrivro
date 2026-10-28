import { useState } from "react";
import { Dialog } from "@llkit/controls.js";
import { ProfileHead } from "./ProfileHead.js";
import type { Profile } from "./useProfile.js";
import { t } from "../../i18n/i18n.js";

interface Form extends Profile {
  name: string;
  bookAuthor: string;
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="profile-field">
      <span className="field-label">{props.label}</span>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

function AboutField(props: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="profile-field">
      <span className="field-label">{t("Om författaren")}</span>
      <textarea
        value={props.value}
        placeholder={t("Några meningar om dig. De står under kapitel du skickar som nyhetsbrev.")}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

// The pen name belongs to a book, so it is asked only while one is open.
const PenName = (props: { form: Form; bookName: string; set: (change: Partial<Form>) => void }) => (
  <Field
    label={t("Författarnamn för {book}", { book: props.bookName })}
    value={props.form.bookAuthor}
    placeholder={t("Pseudonym, valfritt")}
    onChange={(bookAuthor) => props.set({ bookAuthor })}
  />
);

function ProfileFields({
  form,
  bookName,
  set,
}: {
  form: Form;
  bookName: string | null;
  set: (change: Partial<Form>) => void;
}) {
  return (
    <>
      <div className="profile-pair">
        <Field label={t("Namn")} value={form.name} onChange={(name) => set({ name })} />
        {bookName !== null && <PenName form={form} bookName={bookName} set={set} />}
      </div>
      <AboutField value={form.about} onChange={(about) => set({ about })} />
      <Field
        label={t("Länk till din sida eller ditt nyhetsbrev")}
        value={form.link}
        placeholder="https://"
        onChange={(link) => set({ link })}
      />
    </>
  );
}

function ProfileFoot({ onDone }: { onDone: () => void }) {
  return (
    <div className="profile-foot">
      <span className="setting-hint">
        {t(
          "Profilen sparas i din Skrivro-mapp. Loggar du in med Google följer den med till dina andra enheter.",
        )}
      </span>
      <button className="button primary" onClick={onDone}>
        {t("Klar")}
      </button>
    </div>
  );
}

/** Författarprofil: who writes, kept in the Skrivro folder; no account, no sign-in. */
export function ProfileDialog(props: {
  initial: Form;
  /** The name of the open book; none on the shelf. */
  bookName: string | null;
  onSave: (form: Form) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(props.initial);
  const set = (change: Partial<Form>) => setForm((current) => ({ ...current, ...change }));
  const done = () => (props.onSave(form), props.onClose());
  return (
    <Dialog label={t("Författarprofil")} className="profile-dialog" onClose={done}>
      <ProfileHead form={form} onPicture={(picture) => set({ picture })} />
      <ProfileFields form={form} bookName={props.bookName} set={set} />
      <ProfileFoot onDone={done} />
    </Dialog>
  );
}

export type ProfileForm = Form;
