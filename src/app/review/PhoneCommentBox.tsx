import { usePhone } from "../phone/usePhone.js";
import { Writer } from "./CommentsSection.js";
import type { useComments } from "./useComments.js";
import { t } from "../../i18n/i18n.js";

/** On a phone, Kommentera opens this over the foot of the text, which stays in sight above it:
 * mark, Kommentera, write and Klar. */
export function PhoneCommentBox({ comments }: { comments: ReturnType<typeof useComments> }) {
  const isPhone = usePhone();
  if (!comments.draft || !isPhone) return null;
  return (
    <div className="phone-comment-box" role="dialog" aria-label={t("Kommentera")}>
      <span className="comment-quote">”{comments.draft.quote}”</span>
      <Writer
        label={t("Kommentera")}
        sendLabel={t("Klar")}
        onSend={comments.add}
        onCancel={comments.cancel}
      />
    </div>
  );
}
