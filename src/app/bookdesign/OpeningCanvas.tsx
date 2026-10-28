import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { trimSize, type BookDesign } from "../../export/bookDesign.js";
import type { OpeningTemplate, PictureArea } from "../../export/openings.js";
import { marginsOf } from "../../export/bookDesign.js";
import { useBookPicture } from "./PictureRow.js";
import { t } from "../../i18n/i18n.js";

/** Moves by shares of the page: (0.1, 0) is a tenth of the page's width to the right. */
type Move = (across: number, down: number) => void;

const SNAP = 0.015;
// Close to the paper's edge or the middle, a side lands exactly there.
const snapped = (value: number) =>
  [0, 0.5, 1].find((line) => Math.abs(value - line) < SNAP) ?? value;
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function useDrag() {
  const page = useRef<HTMLDivElement>(null);
  const start = (event: ReactPointerEvent, move: Move) => {
    event.preventDefault();
    event.stopPropagation();
    const box = page.current?.getBoundingClientRect();
    if (!box) return;
    const from = { x: event.clientX, y: event.clientY };
    const onMove = (next: PointerEvent) =>
      move((next.clientX - from.x) / box.width, (next.clientY - from.y) / box.height);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return { page, start };
}

const percent = (value: number) => `${value * 100}%`;

function moved(shown: PictureArea, across: number, down: number): PictureArea {
  const x = snapped(clamp(shown.x + across, 0, 1 - shown.width));
  const y = snapped(clamp(shown.y + down, 0, 1 - shown.height));
  const right = snapped(x + shown.width);
  const bottom = snapped(y + shown.height);
  return { ...shown, x: right === 1 ? 1 - shown.width : x, y: bottom === 1 ? 1 - shown.height : y };
}

function resized(shown: PictureArea, across: number, down: number): PictureArea {
  const right = snapped(clamp(shown.x + shown.width + across, shown.x + 0.03, 1));
  const bottom = snapped(clamp(shown.y + shown.height + down, shown.y + 0.02, 1));
  return { ...shown, width: right - shown.x, height: bottom - shown.y };
}

type Change = (across: number, down: number) => PictureArea;

const placeOf = (area: PictureArea): CSSProperties => ({
  left: percent(area.x),
  top: percent(area.y),
  width: percent(area.width),
  height: percent(area.height),
});

function AreaPicture({ dir, area }: { dir: string; area: PictureArea }) {
  const url = useBookPicture(dir, area.picture);
  if (!url) return <span>{t("Bildyta")}</span>;
  return <img src={url} alt="" style={{ objectFit: area.fit === "fyll" ? "cover" : "contain" }} />;
}

function AreaBox(props: {
  dir: string;
  area: PictureArea;
  isSelected: boolean;
  onPick: () => void;
  onDrag: (event: ReactPointerEvent, change: Change) => void;
}) {
  const { area } = props;
  const grab = (event: ReactPointerEvent) => {
    props.onPick();
    props.onDrag(event, (across, down) => moved(area, across, down));
  };
  return (
    <div
      className={props.isSelected ? "opening-area selected" : "opening-area"}
      style={placeOf(area)}
      onPointerDown={grab}
    >
      <AreaPicture dir={props.dir} area={area} />
      <span
        className="opening-handle"
        onPointerDown={(event) =>
          props.onDrag(event, (across, down) => resized(area, across, down))
        }
      />
    </div>
  );
}

function HeadingSample(props: {
  design: BookDesign;
  template: OpeningTemplate;
  onDrag: (event: ReactPointerEvent) => void;
}) {
  const { template } = props;
  const align = template.headingAlign === "vanster" ? "left" : "center";
  const { width } = trimSize(props.design.trim);
  const margins = marginsOf(props.design);
  const place: CSSProperties = {
    top: percent(template.headingTop),
    left: percent(margins.inside / width),
    right: percent(margins.outside / width),
    textAlign: align,
  };
  return (
    <div className="opening-heading" style={place} onPointerDown={props.onDrag}>
      <span className="opening-label">{t("KAPITEL 1")}</span>
      <span style={{ fontFamily: props.design.headingFont }}>{t("Kapitlets titel")}</span>
    </div>
  );
}

// Where the text goes: a dashed frame at the margins, to place pictures against.
function MarginGuide({ design }: { design: BookDesign }) {
  const { width, height } = trimSize(design.trim);
  const margins = marginsOf(design);
  const guide: CSSProperties = {
    left: percent(margins.inside / width),
    right: percent(margins.outside / width),
    top: percent(margins.top / height),
    bottom: percent(margins.bottom / height),
  };
  return <div className="opening-guide" style={guide} />;
}

type CanvasProps = {
  design: BookDesign;
  template: OpeningTemplate;
  dir: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (template: OpeningTemplate) => void;
};

// Every drag is measured from where it started, so the template it began with is the one changed.
function useCanvasDrags({ template, onChange }: CanvasProps) {
  const { page, start } = useDrag();
  const dragArea = (area: PictureArea) => (event: ReactPointerEvent, change: Change) =>
    start(event, (across, down) => {
      const next = change(across, down);
      onChange({
        ...template,
        areas: template.areas.map((other) => (other.id === area.id ? next : other)),
      });
    });
  const dragHeading = (event: ReactPointerEvent) =>
    start(event, (_across, down) =>
      onChange({ ...template, headingTop: clamp(template.headingTop + down, 0, 0.9) }),
    );
  return { page, dragArea, dragHeading };
}

/** The opening page as it is printed, a right-hand page: drag areas and the heading into place. */
export function OpeningCanvas(props: CanvasProps) {
  const { design, template } = props;
  const { page, dragArea, dragHeading } = useCanvasDrags(props);
  const { width, height } = trimSize(design.trim);
  return (
    <div
      ref={page}
      className="opening-page"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={() => props.onSelect(null)}
    >
      <MarginGuide design={design} />
      {template.areas.map((area) => (
        <AreaBox
          key={area.id}
          dir={props.dir}
          area={area}
          isSelected={area.id === props.selected}
          onPick={() => props.onSelect(area.id)}
          onDrag={dragArea(area)}
        />
      ))}
      <HeadingSample design={design} template={template} onDrag={dragHeading} />
    </div>
  );
}
