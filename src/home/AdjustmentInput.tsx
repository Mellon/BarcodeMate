import React, { useEffect, useRef, useState } from "react";

export function AdjustmentInput({
  value,
  onChange,
}: {
  value: number;
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
      step={0.1}
      value={draft}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(event) => {
        // Keep incomplete signs/decimals in the editor; only valid numbers update the paper.
        setDraft(event.target.value);
        const next = event.target.valueAsNumber;
        if (
          event.target.value !== "" &&
          Number.isFinite(next)
        )
          onChange(next);
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(String(value));
      }}
    />
  );
}
