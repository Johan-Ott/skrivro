import { createStore } from "@llkit/store.js";
import { Dialog, DialogButtons } from "@llkit/controls.js";

// A question that needs a yes, asked in Skrivro's own dialog instead of the system's.

type Question = { title: string; message: string; okLabel: string };
type Asked = Question & { answer: (isSure: boolean) => void };

const asked = createStore<Asked | null>(null);

/** True when the writer agrees, false when they cancel or close the dialog. */
export const confirmInApp = (question: Question) =>
  new Promise<boolean>((answer) => asked.set({ ...question, answer }));

export function ConfirmLayer() {
  const question = asked.use();
  if (!question) return null;
  const close = (isSure: boolean) => {
    asked.set(null);
    question.answer(isSure);
  };
  return (
    <Dialog label={question.title} onClose={() => close(false)}>
      <p className="setting-hint">{question.message}</p>
      <DialogButtons
        label={question.okLabel}
        onCancel={() => close(false)}
        onConfirm={() => close(true)}
      />
    </Dialog>
  );
}
