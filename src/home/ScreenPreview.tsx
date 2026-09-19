import React, { useEffect, useState } from "react";
import { text } from "./i18n";

const STORE = "barcodemate.screen-calibration.v1";
const DEFAULT_SCALE = 96 / 25.4;
function screenIdentity() {
  const display = window.screen as Screen & {
    availLeft?: number;
    availTop?: number;
  };
  return [
    display.width,
    display.height,
    display.availLeft || 0,
    display.availTop || 0,
    window.devicePixelRatio,
    window.visualViewport?.scale || 1,
  ].join(":");
}
function readScales(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        ([, scale]) => typeof scale === "number" && scale >= 0.5 && scale <= 20,
      ),
    ) as Record<string, number>;
  } catch {
    return {};
  }
}

export function useScreenPreview(language: string) {
  const t = (key: Parameters<typeof text>[1]) => text(language, key);
  const [physical, setPhysical] = useState(false);
  const [identity, setIdentity] = useState(screenIdentity);
  const [scales, setScales] = useState(readScales);
  const saved = scales[identity];
  const [draft, setDraft] = useState(saved || DEFAULT_SCALE);
  const [editing, setEditing] = useState(false);
  const [guides, setGuides] = useState(true);
  useEffect(() => {
    const changed = () => setIdentity(screenIdentity());
    window.addEventListener("resize", changed);
    window.visualViewport?.addEventListener("resize", changed);
    // Moving a window to another monitor does not always emit resize.
    const timer = setInterval(changed, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", changed);
      window.visualViewport?.removeEventListener("resize", changed);
    };
  }, []);
  useEffect(() => {
    setDraft(saved || DEFAULT_SCALE);
    setEditing(false);
  }, [identity, saved]);
  const needsCalibration = editing || !saved;
  const pixelsPerMm = needsCalibration ? draft : saved;
  const adjust = (value: number) => {
    setDraft(Math.min(20, Math.max(0.5, value)));
    setEditing(true);
  };
  const confirm = () => {
    const next = Object.fromEntries([
      ...Object.entries(scales)
        .filter(([key]) => key !== identity)
        .slice(-7),
      [identity, draft],
    ]);
    setScales(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
    setEditing(false);
  };
  const controls = (
    <div className="hm-screen-controls">
      <div className="hm-tabs">
        <button
          type="button"
          aria-pressed={!physical}
          onClick={() => setPhysical(false)}
        >
          {t("fitScreen")}
        </button>
        <button
          type="button"
          aria-pressed={physical}
          onClick={() => setPhysical(true)}
        >
          {t("physicalSize")}
        </button>
      </div>
      {physical && (
        <>
          <p className="hm-calibration-status" role="status">
            {needsCalibration ? t("calibrationNeeded") : t("calibrationSaved")}
          </p>
          <p>{t("paperMatchHelp")}</p>
          <div className="hm-ruler-adjust">
            <button
              type="button"
              aria-label={t("screenScale") + " −"}
              onClick={() => adjust(draft - 0.005)}
            >
              −
            </button>
            <input
              type="range"
              aria-label={t("screenScale")}
              min={0.5}
              max={20}
              step={0.005}
              value={draft}
              onChange={(e) => adjust(Number(e.target.value))}
            />
            <button
              type="button"
              aria-label={t("screenScale") + " +"}
              onClick={() => adjust(draft + 0.005)}
            >
              +
            </button>
            <button className="hm-primary" type="button" onClick={confirm}>
              {t("confirmCalibration")}
            </button>
          </div>
          <p className="hm-hint">{t("screenReminder")}</p>
        </>
      )}
      <label className="hm-check">
        <input
          type="checkbox"
          checked={guides}
          onChange={(e) => setGuides(e.target.checked)}
        />
        {t("screenGuides")}
      </label>
    </div>
  );
  return { physical, pixelsPerMm, guides, controls };
}
