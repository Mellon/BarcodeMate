import React, { useEffect, useState } from "react";

export function BadgeNameInput({ value, label, onChange }: {
  value: string;
  label: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return <span className="hm-name-editor">
    <span aria-hidden="true">{draft || value}</span>
    <input type="text" dir="auto" aria-label={label} value={draft} maxLength={120}
      onChange={event => setDraft(event.target.value)}
      onBlur={() => {
        const name = draft.trim();
        setDraft(name || value);
        if (name && name !== value) onChange(name);
      }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          setDraft(value);
        }
      }} />
  </span>;
}
