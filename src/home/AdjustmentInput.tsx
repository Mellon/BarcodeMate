import React, { useEffect, useRef, useState } from "react";

export function AdjustmentInput({
  value,
  onChange,
  integer = false,
}: {
  value: number;
  integer?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  return (
    <input
      type="number"
      step={integer ? 1 : 0.1}
      inputMode={integer ? "numeric" : "decimal"}
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => {
        const next = event.target.valueAsNumber;
        // Counts reject fractional values, including pasted values, without rounding.
        if (integer && Number.isFinite(next) && !Number.isInteger(next)) {
          event.currentTarget.value = String(value);
          setDraft(String(value));
          return;
        }
        // Keep incomplete signs/decimals in the editor; only valid numbers update the paper.
        setDraft(event.target.value);
        if (event.target.value !== "" && Number.isFinite(next)) onChange(next);
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(String(value));
      }}
    />
  );
}
