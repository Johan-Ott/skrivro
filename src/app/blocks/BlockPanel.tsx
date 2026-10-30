import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { CloseButton } from "@llkit/controls.js";
import { usePhone } from "../phone/usePhone.js";
import { Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { BlockTitle, DockButton, inDock, useDock, useDocked } from "./dock.js";
import {
  DOCKABLE,
  keepPlaces,
  minimized,
  places,
  setPlace,
  toggleMinimized,
  type Place,
} from "./layout.js";

// A panel lies docked in the column at the card's right. Loosened, it floats over the text,
// dragged by its head to where the writer wants it; the place is kept.

// Kept inside the card, so a block never ends up where it cannot be reached.
function clamped(panel: HTMLElement, wanted: Place): Place {
  // A fixed panel has no offset parent: the window is its room.
  const room = panel.offsetParent?.getBoundingClientRect() ?? {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  return {
    left: Math.max(0, Math.min(wanted.left, room.width - panel.offsetWidth)),
    top: Math.max(0, Math.min(wanted.top, room.height - panel.offsetHeight)),
  };
}

// The window follows the pointer until it lets go, wherever it goes meanwhile.
function useDrag(id: string) {
  const place = places.use()[id] ?? null;
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const grab = { x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop };
    let last: Place | null = null;
    const move = (moved: globalThis.PointerEvent) => {
      last = clamped(panel, { left: moved.clientX - grab.x, top: moved.clientY - grab.y });
      setPlace(id, last);
    };
    const drop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      if (last) keepPlaces();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
  };
  return { place, onPointerDown };
}

// A place kept from a larger room is shown inside this one, but stays kept: when the room grows
// again the panel goes back to where the writer left it.
function useKeptInside(panel: RefObject<HTMLElement | null>, place: Place | null) {
  const [inside, setInside] = useState<Place | null>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element || !place) {
      setInside(null);
      return;
    }
    const fit = () => {
      const fitted = clamped(element, place);
      const isMoved = fitted.left !== place.left || fitted.top !== place.top;
      setInside(isMoved ? fitted : null);
    };
    fit();
    const room = new ResizeObserver(fit);
    if (element.offsetParent) room.observe(element.offsetParent);
    window.addEventListener("resize", fit);
    return () => {
      room.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [panel, place]);
  return inside ?? place;
}

/** A panel docked, or loosened and moved by its head, and drawn down to its head when the writer
 * wants; `isOn` false leaves it to the CSS, as on a phone, where panels cover the screen. */
export function useFloating(id: string, isOn = true) {
  const { place, onPointerDown } = useDrag(id);
  const ref = useRef<HTMLElement>(null);
  const { dock, isBehind } = useDock(id, isOn);
  const isFree = isOn && !dock;
  const isMinimized = minimized.use().includes(id) && isOn;
  const shown = useKeptInside(ref, isFree ? place : null);
  return {
    ref,
    style: shown ?? undefined,
    onPointerDown: isFree ? onPointerDown : undefined,
    minimized: isMinimized ? " minimized" : "",
    dock,
    isBehind,
  };
}

const MinimizeIcon = () => (
  <Icon size={14}>
    <path d="M6 12h12" />
  </Icon>
);

const RestoreIcon = () => (
  <Icon size={14}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Icon>
);

/** Minimera leaves only the head. */
function MinimizeButton({ id }: { id: string }) {
  const isMinimized = minimized.use().includes(id);
  const label = isMinimized ? t("Visa hela panelen") : t("Minimera");
  return (
    <button
      className="block-minimize"
      aria-label={label}
      title={label}
      aria-expanded={!isMinimized}
      onClick={() => toggleMinimized(id)}
    >
      {isMinimized ? <RestoreIcon /> : <MinimizeIcon />}
    </button>
  );
}

/** Lossa or Docka, and Minimera for a loose panel; docked, its title folds it. Close only where
 * the panel cannot dock: Mål, and every panel on a phone. */
export function HeadButtons(props: {
  id: string;
  closeLabel?: string;
  isPhoneBack?: boolean;
  onClose?: (() => void) | undefined;
}) {
  const canDock = !usePhone() && DOCKABLE.includes(props.id);
  const isDocked = useDocked(props.id);
  return (
    <span className="block-head-buttons">
      {canDock && <DockButton id={props.id} />}
      {!isDocked && <MinimizeButton id={props.id} />}
      {!canDock && props.onClose && (
        <CloseButton
          label={props.closeLabel}
          isPhoneBack={props.isPhoneBack}
          onClose={props.onClose}
        />
      )}
    </span>
  );
}

/** Loose without a kept place, it opens at the card's foot on the right. */
export function BlockPanel(props: {
  id: string;
  title: string;
  className?: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  const { ref, style, onPointerDown, minimized, dock, isBehind } = useFloating(
    props.id,
    !usePhone(),
  );
  return inDock(
    { dock, isBehind },
    <section
      ref={ref}
      className={(props.className ? `block-panel ${props.className}` : "block-panel") + minimized}
      aria-label={props.title}
      style={style}
    >
      <header className="block-head" onPointerDown={onPointerDown}>
        <BlockTitle id={props.id} title={props.title} />
        <HeadButtons id={props.id} isPhoneBack onClose={props.onClose} />
      </header>
      {props.children}
    </section>,
  );
}
