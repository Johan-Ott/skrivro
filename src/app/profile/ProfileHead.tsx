import { platform } from "../platform.js";
import { Avatar } from "./Avatar.js";
import type { Profile } from "./useProfile.js";
import { t } from "../../i18n/i18n.js";

const PICTURE = { name: t("Bild"), extensions: ["jpg", "jpeg", "png"] };
const SIDE = 192;

// Cut to a square from the middle and made small, so the profile file stays small.
async function smallPicture(bytes: Uint8Array) {
  const image = await createImageBitmap(new Blob([bytes.slice()]));
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const left = (image.width - side) / 2;
  const top = (image.height - side) / 2;
  canvas.getContext("2d")?.drawImage(image, left, top, side, side, 0, 0, SIDE, SIDE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ProfileHead(props: {
  form: Pick<Profile, "picture"> & { name: string };
  onPicture: (picture: string) => void;
}) {
  const pick = async () => {
    const picked = await platform.pickFile(PICTURE);
    if (picked) props.onPicture(await smallPicture(picked.bytes));
  };
  return (
    <div className="profile-head">
      <Avatar name={props.form.name} picture={props.form.picture} size={64} />
      <span className="profile-who">
        <span className="profile-name">{props.form.name || t("Ditt namn")}</span>
      </span>
      <button className="button secondary small" onClick={() => void pick()}>
        {t("Byt bild")}
      </button>
    </div>
  );
}
