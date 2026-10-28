import { useEffect, useState } from "react";

/** An address for an <img>, made from the picture's bytes and let go when another is shown.
 * `key` is null for none, and tells when it is another picture: its path, or the picture itself. */
export function usePictureUrl(key: unknown, read: () => Promise<Uint8Array | null>) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // The picture before is not this one, so it is not shown while this one is read.
    setUrl(null);
    if (key === null) return;
    let isCurrent = true;
    let made: string | null = null;
    const show = (bytes: Uint8Array | null) => {
      if (!bytes || !isCurrent) return;
      made = URL.createObjectURL(new Blob([bytes.slice()]));
      setUrl(made);
    };
    read().then(show, () => undefined);
    return () => {
      isCurrent = false;
      if (made) URL.revokeObjectURL(made);
    };
    // `read` is made anew each render; the key alone says when the picture is another.
  }, [key]);
  return url;
}
