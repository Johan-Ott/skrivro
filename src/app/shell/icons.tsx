import type { ReactNode } from "react";

export function Icon({ size = 16, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = () => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </Icon>
);

export const SidebarIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </Icon>
);

/** The sidebar's mirror, for the right column. */
export const ColumnIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M15 4v16" />
  </Icon>
);

export const BackIcon = () => (
  <Icon>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
);

export const ForwardIcon = () => (
  <Icon>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

export const PenIcon = () => (
  <Icon size={15}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Icon>
);

export const BookIcon = () => (
  <Icon size={15}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 21V5" />
  </Icon>
);

/** Two open pages, for Läs som bok. */
export const ReadIcon = () => (
  <Icon>
    <path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z" />
    <path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z" />
  </Icon>
);

export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const FocusIcon = () => (
  <Icon>
    <path d="M4 9V5h4" />
    <path d="M16 5h4v4" />
    <path d="M20 15v4h-4" />
    <path d="M8 19H4v-4" />
  </Icon>
);

export const ChevronDownIcon = () => (
  <Icon size={14}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const TreeIcon = () => (
  <Icon>
    <path d="M4 6h16" />
    <path d="M8 12h12" />
    <path d="M8 18h12" />
  </Icon>
);

export const ContentsIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M9 10v10" />
  </Icon>
);

export const TimerIcon = () => (
  <Icon>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2" />
    <path d="M10 2h4" />
  </Icon>
);

export const UnfoldIcon = () => (
  <Icon size={15}>
    <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />
  </Icon>
);

export const FoldIcon = () => (
  <Icon size={15}>
    <path d="m7 4 5 5 5-5M7 20l5-5 5 5" />
  </Icon>
);

export const FilterIcon = () => (
  <Icon size={15}>
    <path d="M3 5h18l-7 8v6l-4-2v-4z" />
  </Icon>
);

// Six dots: what can be dragged by.
export const GripIcon = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor" aria-hidden="true">
    <circle cx="2" cy="2" r="1.2" />
    <circle cx="6" cy="2" r="1.2" />
    <circle cx="2" cy="6" r="1.2" />
    <circle cx="6" cy="6" r="1.2" />
    <circle cx="2" cy="10" r="1.2" />
    <circle cx="6" cy="10" r="1.2" />
  </svg>
);

export const NoteIcon = () => (
  <Icon>
    <path d="M15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z" />
    <path d="M15 3v6h6" />
  </Icon>
);

export const PeopleIcon = () => (
  <Icon>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
  </Icon>
);

export const ImageIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </Icon>
);

export const LayoutIcon = () => (
  <Icon>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18" />
    <path d="M9 21V9" />
  </Icon>
);

export const ChartIcon = () => (
  <Icon>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M21 20H3" />
  </Icon>
);

export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Icon>
);

export const GridIcon = () => (
  <Icon>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </Icon>
);
