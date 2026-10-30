import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label: string;
  /** The label's own class, such as a style showing itself in its own look. */
  labelClass?: string | undefined;
  shortcut?: string;
  /** Grey beside the label, as a shortcut is, but on a phone too. */
  hint?: string;
  separatorBefore?: boolean;
  isChecked?: boolean;
  onSelect?: () => void;
  /** Opens beside the row, on hover, a click or →, instead of choosing. */
  submenu?: MenuItem[];
}

type Submenu = { label: string; items: MenuItem[]; x: number; y: number } | null;

interface MenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  label: string;
  onClose: () => void;
}

const EDGE = 8;
const NARROW = 600;
// On a phone a submenu opens by a tap only, and in the menu's place.
const isWide = () => window.innerWidth > NARROW;

function useDismiss(onClose: () => void) {
  useEffect(() => {
    window.addEventListener("pointerdown", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);
}

function useFittedPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const left = Math.max(EDGE, Math.min(x, window.innerWidth - box.width - EDGE));
    const top = y + box.height > window.innerHeight - EDGE ? Math.max(EDGE, y - box.height) : y;
    setPosition({ left, top });
  }, [x, y]);
  return { ref, position };
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>, onClose: () => void) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role^=menuitem]"));
  const index = items.indexOf(document.activeElement as HTMLElement);
  const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
  if (event.key === "Escape") onClose();
  if (step === undefined && event.key !== "Escape") return;
  event.preventDefault();
  if (step !== undefined) items[(index + step + items.length) % items.length]?.focus();
}

// A choice menu opens on its current choice, even with an action last; others on their first item.
function focusIndexOf(items: MenuItem[]) {
  const isChoiceMenu = items[0]?.isChecked !== undefined;
  return isChoiceMenu
    ? Math.max(
        0,
        items.findIndex((item) => item.isChecked),
      )
    : 0;
}

/** The one menu used for right-click, the add button and the style picker. */
export function Menu({ x, y, items, label, onClose }: MenuProps) {
  useDismiss(onClose);
  const { ref, position } = useFittedPosition(x, y);
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const hasChecks = items.some((item) => item.isChecked !== undefined);
  // A phone has no room beside the menu, so the submenu takes its place.
  if (submenu && !isWide()) return <Menu {...submenu} x={x} y={y} onClose={onClose} />;
  return createPortal(
    <div
      ref={ref}
      className="menu"
      role="menu"
      aria-label={label}
      style={position}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => moveFocus(event, onClose)}
    >
      {items.map((item, index) => (
        <MenuRow
          key={item.label}
          {...{ item, hasChecks, onClose }}
          isFocused={index === focusIndexOf(items)}
          onSubmenu={setSubmenu}
        />
      ))}
      {submenu && <Menu {...submenu} onClose={onClose} />}
    </div>,
    document.body,
  );
}

const submenuOf = (item: MenuItem, row: HTMLElement): Submenu => {
  if (!item.submenu) return null;
  const box = row.getBoundingClientRect();
  return { label: item.label, items: item.submenu, x: box.right - 4, y: box.top - 4 };
};

interface RowProps {
  item: MenuItem;
  hasChecks: boolean;
  isFocused: boolean;
  onClose: () => void;
  onSubmenu: (submenu: Submenu) => void;
}

function MenuRow(props: RowProps) {
  const { item, onSubmenu } = props;
  const choose = (row: HTMLElement) => {
    if (item.submenu) return onSubmenu(submenuOf(item, row));
    props.onClose();
    item.onSelect?.();
  };
  return (
    <>
      {item.separatorBefore && <div className="menu-separator" role="separator" />}
      <button
        role={item.isChecked === undefined ? "menuitem" : "menuitemradio"}
        aria-checked={item.isChecked}
        aria-haspopup={item.submenu ? "menu" : undefined}
        autoFocus={props.isFocused}
        onPointerEnter={(event) => isWide() && onSubmenu(submenuOf(item, event.currentTarget))}
        onKeyDown={(event) => event.key === "ArrowRight" && choose(event.currentTarget)}
        onClick={(event) => choose(event.currentTarget)}
      >
        <RowContent item={item} hasChecks={props.hasChecks} />
      </button>
    </>
  );
}

const RowContent = ({ item, hasChecks }: { item: MenuItem; hasChecks: boolean }) => (
  <>
    {hasChecks && <span className="menu-check">{item.isChecked ? "✓" : ""}</span>}
    <span className={`menu-label ${item.labelClass ?? ""}`}>{item.label}</span>
    {item.shortcut && <kbd>{item.shortcut}</kbd>}
    {item.hint && <span className="menu-hint">{item.hint}</span>}
    {item.submenu && <span className="menu-more">›</span>}
  </>
);

export function useMenuButton(label: string, items: MenuItem[]) {
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const open = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    setPlace({ x: box.left, y: box.bottom + 4 });
  };
  const menu = place && (
    <Menu {...place} label={label} items={items} onClose={() => setPlace(null)} />
  );
  return { open, menu };
}
