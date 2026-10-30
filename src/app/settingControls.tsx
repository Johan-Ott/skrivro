// The controls the Aa panel is built from: a row of choices, a switch and a value that steps.

export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onSelect: (value: T) => void;
}) {
  return (
    <div className="setting-column">
      <span className="setting-label">{props.label}</span>
      <div className="segmented" role="radiogroup" aria-label={props.label}>
        {props.options.map(([value, text]) => (
          <button
            key={value}
            role="radio"
            aria-checked={value === props.value}
            onClick={() => props.onSelect(value)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle(props: { label: string; hint: string; isOn: boolean; onFlip: () => void }) {
  return (
    <div className="setting-row">
      <span className="setting-text">
        <span>{props.label}</span>
        <span className="setting-hint">{props.hint}</span>
      </span>
      <button
        className="toggle"
        role="switch"
        aria-checked={props.isOn}
        aria-label={props.label}
        onClick={props.onFlip}
      >
        <span />
      </button>
    </div>
  );
}

export function ValueRow(props: { label: string; value: string; onNext: () => void }) {
  return (
    <div className="setting-row">
      <span>{props.label}</span>
      <button className="setting-value" onClick={props.onNext}>
        {props.value}
      </button>
    </div>
  );
}
