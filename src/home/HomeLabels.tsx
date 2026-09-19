import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  newHome,
  validateHome,
  validPaper,
  parseList,
  rankedPapers,
  papers,
  documentHTML,
  type HomeProject,
  type HomeItem,
  type Paper,
} from "./core";
import { text, homeLanguages, isRTL, type HomeKey } from "./i18n";
import "./home.css";
import {
  groupedItems,
  labelKey,
  withQuantity,
  groupedQuantities,
  quantityKey,
  withTotalQuantity,
  withName,
} from "./quantities";
import { activateLabelSet, presetItems, samePreset } from "./presets";
import {
  addDate,
  applyDate,
  dateHighlightColor,
  hasSelectedDate,
  sixMonthsFrom,
} from "./dates";
import { AdjustmentInput } from "./AdjustmentInput";
import { BadgeNameInput } from "./BadgeNameInput";
import { voiceWav } from "./audio";
import { useScreenPreview } from "./ScreenPreview";
import { countryForTimeZone, regionChoices, regionCodes } from "./regional";
const REGION_STORE = "barcodemate.home.region.v1";
const STORE = "barcodemate.home.v1";
const languageName = (code: string) => {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) || code;
  } catch {
    return code;
  }
};
interface Props {
  onSave?: (content: string) => Promise<unknown>;
  language: string;
  onPrint?: (html: string, paper: Paper, pdf: boolean) => Promise<unknown>;
  voiceAPI?: {
    capabilities: () => Promise<{ voice: boolean; country?: string }>;
    recognize: (
      body: unknown,
    ) => Promise<{ items: HomeItem[]; language: string; bilingual: boolean }>;
  };
}
export function HomeLabels({ language, onPrint, onSave, voiceAPI }: Props) {
  const t = (k: HomeKey) => text(language, k);
  const screenPreview = useScreenPreview(language);
  const regionLocked = useRef(false);
  const timezoneRegion = useMemo(() => {
    try {
      return countryForTimeZone(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    } catch {
      return "";
    }
  }, []);
  const [detectedRegion, setDetectedRegion] = useState("");
  const [project, setProject] = useState<HomeProject>(() => {
    let saved: HomeProject | undefined;
    try {
      const value = localStorage.getItem(STORE);
      if (value) saved = validateHome(JSON.parse(value));
    } catch {}
    let region = saved?.region || "";
    regionLocked.current = !!region;
    if (!region) {
      try {
        const preference = localStorage.getItem(REGION_STORE);
        if (
          preference !== null &&
          (preference === "" || regionCodes.includes(preference))
        ) {
          region = preference;
          regionLocked.current = true;
        }
      } catch {}
    }
    if (!regionLocked.current) region = timezoneRegion;
    if (saved)
      return activateLabelSet(
        { ...saved, region, uiLanguage: language },
        saved.uiLanguage === language ? saved.outputLanguage : language,
        saved.activeGroup ?? 0,
      );
    return activateLabelSet(
      {
        ...newHome(),
        region,
        outputLanguage: language,
        uiLanguage: language,
        paper: structuredClone(rankedPapers(region, language)[0]),
      },
      language,
      0,
    );
  });
  const [stored, setStored] = useState(false);
  const [addingDate, setAddingDate] = useState(false);
  const [draftDate, setDraftDate] = useState(sixMonthsFrom);
  const [input, setInput] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [recording, setRecording] = useState(false),
    [cloud, setCloud] = useState(false),
    [page, setPage] = useState(1);
  const group = project.activeGroup ?? 0;
  const undo = useRef<HomeProject[]>([]),
    backupMenu = useRef<HTMLDetailsElement>(null),
    frame = useRef<HTMLIFrameElement>(null),
    file = useRef<HTMLInputElement>(null),
    stop = useRef<(() => void) | null>(null),
    cancel = useRef<(() => void) | null>(null),
    alive = useRef(true);
  const committed = useRef(project);
  committed.current = project;
  const priorLanguage = useRef(language);
  useEffect(() => {
    if (priorLanguage.current === language) return;
    priorLanguage.current = language;
    try {
      setProject(
        activateLabelSet(
          { ...committed.current, uiLanguage: language },
          language,
          group,
        ),
      );
    } catch {
      setNotice(t("error"));
    }
  }, [language]);
  const change = (next: HomeProject) => {
    undo.current.push(structuredClone(committed.current));
    if (undo.current.length > 30) undo.current.shift();
    setProject(next);
    setNotice("");
  };
  const patch = (v: Partial<HomeProject>) =>
    change({ ...committed.current, ...v });
  const api = useMemo(
    () =>
      voiceAPI || {
        capabilities: async () => {
          const r = await fetch("/api/home-labels/capabilities", {
            cache: "no-store",
          });
          if (!r.ok) throw Error();
          return r.json();
        },
        recognize: async (body: unknown) => {
          const r = await fetch("/api/home-labels/voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(45000),
          });
          if (!r.ok) throw Error();
          return r.json();
        },
      },
    [voiceAPI],
  );
  useEffect(() => {
    alive.current = true;
    api
      .capabilities()
      .then((c) => {
        if (!alive.current) return;
        setCloud(c.voice);
        if (c.country && regionCodes.includes(c.country)) {
          setDetectedRegion(c.country);
          if (!regionLocked.current)
            setProject((p) => ({ ...p, region: c.country! }));
        }
      })
      .catch(() => {});
    return () => {
      alive.current = false;
      cancel.current?.();
    };
  }, [api]);
  useEffect(() => {
    try {
      validateHome(project);
      localStorage.setItem(STORE, JSON.stringify(project));
      setStored(true);
    } catch {
      setStored(false);
    }
  }, [project]);
  const englishKitchen = group === 0 && project.outputLanguage === "en";
  const selected = englishKitchen
    ? groupedQuantities(project.items)
    : groupedItems(project.items);
  const presets = presetItems(project, group);
  const choices = presets.flatMap((preset) => {
    const matches = selected.filter((item) => samePreset(item, preset));
    return matches.length ? matches : [{ ...preset, quantity: 0 }];
  });
  const dateBadges = project.kitchenDates || [];
  for (const item of selected)
    if (
      !choices.some((choice) =>
        englishKitchen
          ? quantityKey(choice) === quantityKey(item)
          : labelKey(choice) === labelKey(item),
      )
    )
      choices.push(item);
  const orderedProject = {
    ...project,
    items: choices.flatMap((choice) =>
      project.items.filter((item) =>
        englishKitchen
          ? quantityKey(item) === quantityKey(choice)
          : labelKey(item) === labelKey(choice),
      ),
    ),
  };
  const view = useMemo(() => {
    try {
      validateHome(project);
      return {
        html: documentHTML(orderedProject, false, {
          guides: screenPreview.guides,
        }),
        error: false,
      };
    } catch {
      return { html: "", error: true };
    }
  }, [project, group, screenPreview.physical, screenPreview.guides]);
  const resizePreview = () => {
    const el = frame.current;
    if (!el?.contentDocument?.body) return;
    el.style.width = screenPreview.physical
      ? project.paper.pageWidth * screenPreview.pixelsPerMm + "px"
      : "100%";
    const width = screenPreview.physical
      ? project.paper.pageWidth * screenPreview.pixelsPerMm
      : el.clientWidth;
    el.contentDocument.body.style.zoom = String(
      width / ((project.paper.pageWidth * 96) / 25.4),
    );
    el.style.height =
      (width * project.paper.pageHeight) / project.paper.pageWidth + "px";
  };
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(resizePreview);
    observer.observe(el.parentElement!);
    resizePreview();
    return () => observer.disconnect();
  }, [
    view.html,
    project.paper.pageWidth,
    project.paper.pageHeight,
    screenPreview.physical,
    screenPreview.pixelsPerMm,
  ]);
  useEffect(() => {
    if (screenPreview.physical)
      frame.current
        ?.closest(".hm-preview-panel")
        ?.scrollIntoView({ block: "start" });
  }, [screenPreview.physical]);
  const total = project.items.reduce((n, i) => n + i.quantity, 0),
    pageCount = Math.ceil(total / (project.paper.rows * project.paper.columns));
  useEffect(() => setPage(1), [project.items, project.paper]);
  const add = (items: HomeItem[]) => {
    try {
      const p = validateHome({
        ...committed.current,
        items: [...committed.current.items, ...items],
      });
      change(p);
      setInput("");
    } catch {
      setNotice(t("error"));
    }
  };
  const assignDate = (item: HomeItem, copyIndex = 0) => {
    if (!englishKitchen) return;
    try {
      change(applyDate(committed.current, item, copyIndex));
    } catch {
      setNotice(t("error"));
    }
  };
  const decoratePreview = () => {
    const doc = frame.current?.contentDocument;
    const labels =
      doc?.querySelectorAll<HTMLElement>(".label");
    doc?.querySelectorAll<HTMLElement>(".preview-guide").forEach(guide =>
      guide.style.removeProperty("--label-surface"),
    );
    const flat = orderedProject.items.flatMap((item) =>
      Array.from({ length: item.quantity }, (_, copyIndex) => ({
        item,
        copyIndex,
      })),
    );
    labels?.forEach((label, index) => {
      const copy = flat[index];
      if (!copy || !englishKitchen) return;
      const { item, copyIndex } = copy;
      const selected = hasSelectedDate(project, item);
      const surface = selected
        ? `color-mix(in srgb, ${dateHighlightColor} 8%, white)`
        : "#fff";
      const guide = label.closest(".sheet")?.querySelectorAll<HTMLElement>(".preview-guide")[
        index % (project.paper.rows * project.paper.columns)
      ];
      label.style.color = selected ? dateHighlightColor : "";
      // Keep the paper surface and visual gutters fixed when print offsets move the ink.
      if (guide) guide.style.setProperty("--label-surface", surface);
      label.style.backgroundColor = !guide && selected ? surface : "";
      label.style.cursor = "pointer";
      label.tabIndex = 0;
      label.setAttribute("role", "button");
      label.setAttribute("aria-label", t("applyDate") + " · " + item.name);
      label.setAttribute(
        "aria-pressed",
        String(selected),
      );
      label.onclick = () => assignDate(item, copyIndex);
      label.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          assignDate(item, copyIndex);
        }
      };
    });
  };
  useEffect(decoratePreview, [project, group, view.html]);
  const setQuantity = (item: HomeItem, quantity: number) => {
    if (quantity === item.quantity) return;
    try {
      change(
        englishKitchen
          ? withTotalQuantity(committed.current, item, quantity)
          : withQuantity(committed.current, item, quantity),
      );
    } catch {
      setNotice(t("error"));
    }
  };
  const download = async () => {
    try {
      const p = validateHome(orderedProject);
      if (onSave) {
        await onSave(JSON.stringify(p, null, 2));
        return;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "BarcodeMate-home.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setNotice(t("error"));
    }
  };
  const print = async (pdf: boolean, calibration = false) => {
    setBusy(true);
    setNotice("");
    let check: HTMLIFrameElement | undefined;
    try {
      const html = documentHTML(orderedProject, calibration);
      // Check text layout before printing so long or complex scripts cannot silently clip.
      check = document.createElement("iframe");
      check.className = "hm-print-frame";
      check.setAttribute("sandbox", "allow-same-origin allow-modals");
      check.setAttribute("title", t("preview"));
      document.body.append(check);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("preview-timeout")), 10000);
        check!.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        check!.srcdoc = html;
      });
      await check.contentDocument?.fonts.ready;
      const tooLarge = [
        ...check.contentDocument!.querySelectorAll<HTMLElement>(".text"),
      ].some(
        (el) =>
          el.scrollHeight > el.clientHeight + 1 ||
          el.scrollWidth > el.clientWidth + 1,
      );
      const outsidePage = [
        ...check.contentDocument!.querySelectorAll<HTMLElement>(".text"),
      ].some((el) => {
        const bounds = el.getBoundingClientRect();
        const sheet = el.closest(".sheet")!.getBoundingClientRect();
        return (
          bounds.left < sheet.left - 0.5 ||
          bounds.right > sheet.right + 0.5 ||
          bounds.top < sheet.top - 0.5 ||
          bounds.bottom > sheet.bottom + 0.5
        );
      });
      if (outsidePage) throw Error("offset-overflow");
      if (tooLarge) {
        check.remove();
        throw Error("overflow");
      }
      if (onPrint) {
        check.remove();
        await onPrint(html, project.paper, pdf);
      } else {
        check.contentWindow!.focus();
        check.contentWindow!.print();
        setTimeout(() => check?.remove(), 60000);
      }
    } catch (error) {
      check?.remove();
      setNotice(
        t(
          error instanceof Error && error.message === "offset-overflow"
            ? "offsetError"
            : "error",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const handle = (event: Event) => {
      if (busy || recording) return;
      const action = (event as CustomEvent<string>).detail;
      if (action === "print") void print(false);
      if (action === "save") void download();
      if (action === "open" || action === "import") file.current?.click();
      if (action === "undo") {
        const p = undo.current.pop();
        if (p) setProject(p);
      }
      if (action === "new")
        change({
          ...newHome(),
          region: project.region,
          outputLanguage: project.outputLanguage,
        });
    };
    window.addEventListener("home-menu", handle);
    return () => window.removeEventListener("home-menu", handle);
  }, [project, group, busy, recording]);
  const speak = async () => {
    if (recording) {
      stop.current?.();
      return;
    }
    setNotice("");
    if (cloud) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (!alive.current) {
          stream.getTracks().forEach((x) => x.stop());
          return;
        }
        const mime = [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((x) => MediaRecorder.isTypeSupported(x));
        const recorder = new MediaRecorder(
            stream,
            mime ? { mimeType: mime } : undefined,
          ),
          chunks: Blob[] = [];
        let discarded = false;
        const started = Date.now();
        const finish = () => {
          if (recorder.state !== "inactive") recorder.stop();
        };
        const timer = setTimeout(finish, 60000);
        const clean = () => {
          clearTimeout(timer);
          stream.getTracks().forEach((x) => x.stop());
        };
        cancel.current = () => {
          discarded = true;
          finish();
          clean();
        };
        stop.current = finish;
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onerror = () => {
          discarded = true;
          clean();
          setRecording(false);
          setNotice(t("unavailable"));
        };
        recorder.onstop = async () => {
          clean();
          if (discarded || !alive.current) return;
          setRecording(false);
          setBusy(true);
          try {
            const blob = await voiceWav(
              new Blob(chunks, { type: recorder.mimeType }),
            );
            if (blob.size > 6000000 || !blob.size) throw Error();
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve(String(reader.result).split(",")[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            const current = committed.current;
            const response = await api.recognize({
              audio: data,
              mime: "audio/wav",
              seconds: Math.min(60, (Date.now() - started) / 1000),
              language: current.outputLanguage,
              bilingual: current.bilingual,
              items: current.items
                .filter((item) => item.quantity > 0)
                .map(({ name, second, quantity }) => ({
                  name,
                  second,
                  quantity,
                })),
            });
            const next = validateHome({
              ...activateLabelSet(current, response.language, group),
              outputLanguage: response.language,
              presetGroups: {
                ...current.presetGroups,
                [response.language]: [
                  ...new Set([
                    ...(current.presetGroups?.[response.language] || []),
                    group,
                  ]),
                ],
              },
              bilingual: response.bilingual,
              items: [
                ...response.items.map((i: HomeItem) => {
                  const prior = current.items.find(
                    (item) =>
                      item.name.toLocaleLowerCase() ===
                      i.name.toLocaleLowerCase(),
                  );
                  return {
                    ...i,
                    id: crypto.randomUUID(),
                    ...(prior?.bestBefore !== undefined
                      ? {
                          bestBefore: prior.bestBefore,
                          bestBeforeBadge: prior.bestBeforeBadge,
                        }
                      : group === 0 && response.language === "en"
                        ? { bestBefore: "" }
                        : {}),
                  };
                }),
                ...current.items.filter(
                  (item) =>
                    response.language === current.outputLanguage &&
                    item.quantity === 0 &&
                    !response.items.some(
                      (next: HomeItem) =>
                        next.name.trim().toLowerCase() ===
                        item.name.trim().toLowerCase(),
                    ),
                ),
              ],
            });
            if (alive.current) change(next);
          } catch {
            if (alive.current) setNotice(t("unavailable"));
          } finally {
            if (alive.current) setBusy(false);
          }
        };
        recorder.start();
        setRecording(true);
      } catch {
        setNotice(t("unavailable"));
      }
    } else {
      const Native =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!Native) {
        setNotice(t("unavailable"));
        return;
      }
      try {
        const recognition = new Native();
        recognition.lang =
          project.outputLanguage === "zh-Hans"
            ? "zh-CN"
            : project.outputLanguage === "zh-Hant"
              ? "zh-TW"
              : project.outputLanguage;
        recognition.interimResults = false;
        const timer = setTimeout(() => recognition.stop(), 60000);
        stop.current = () => recognition.stop();
        cancel.current = () => {
          clearTimeout(timer);
          recognition.abort();
        };
        recognition.onresult = (e: any) => {
          if (alive.current)
            setInput((v) => (v ? v + "\n" : "") + e.results[0][0].transcript);
        };
        recognition.onerror = () => {
          if (alive.current) setNotice(t("unavailable"));
        };
        recognition.onend = () => {
          clearTimeout(timer);
          if (alive.current) setRecording(false);
        };
        recognition.start();
        setRecording(true);
      } catch {
        setNotice(t("unavailable"));
      }
    }
  };
  const paperField = (
    key: keyof Paper,
    label: HomeKey,
    min = 0,
    max = 500,
    step = 0.1,
  ) => (
    <label key={key}>
      {t(label)}{" "}
      <input
        type="number"
        aria-label={t(label)}
        min={min}
        max={max}
        step={step}
        value={project.paper[key] as number}
        onChange={(e) =>
          patch({
            paper: {
              ...project.paper,
              id: "custom",
              name: t("custom"),
              [key]: Number(e.target.value),
            },
          })
        }
      />
    </label>
  );
  const sorted = rankedPapers(project.region, language);
  const regions = regionChoices(
    project.region,
    detectedRegion,
    timezoneRegion,
    language,
    navigator.languages,
  );
  const displayRegions = new Intl.DisplayNames([language], { type: "region" });
  const selectPaper = (id: string) => {
    const p = papers.find((p) => p.id === id);
    patch({
      paper: p
        ? structuredClone(p)
        : { ...project.paper, id: "custom", name: t("custom") },
    });
  };
  return (
    <div
      className={screenPreview.physical ? "hm-root hm-physical" : "hm-root"}
      dir={isRTL(language) ? "rtl" : "ltr"}
    >
      <div className="hm-heading">
        <div>
          <p className="hm-eyebrow">BARCODEMATE / HOME</p>
          <h1>{t("title")}</h1>
          <p>{t("empty")}</p>
        </div>
        <div className="hm-actions">
          <span className="hm-autosave" role="status">{stored ? t("local") : t("error")}</span>
          <button
            onClick={() => {
              const p = undo.current.pop();
              if (p) setProject(p);
            }}
            disabled={!undo.current.length || busy || recording}
          >
            {t("undo")}
          </button>
          <details className="hm-backup" ref={backupMenu}
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }}
            onKeyDown={event => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}>
            <summary>{t("backup")}<svg className="hm-backup-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
            <div className="hm-backup-options">
              <button disabled={busy || recording} onClick={() => {
                if (backupMenu.current) backupMenu.current.open = false;
                void download();
              }}>{t("save")}</button>
              <button disabled={busy || recording} onClick={() => {
                if (backupMenu.current) backupMenu.current.open = false;
                file.current?.click();
              }}>{t("open")}</button>
            </div>
          </details>
          <input
            ref={file}
            type="file"
            accept=".json"
            hidden
            onChange={async (e) => {
              try {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 1000000) throw Error();
                const loaded = validateHome(JSON.parse(await f.text()));
                regionLocked.current = true;
                if (!papers.some((p) => p.id === loaded.paper.id))
                  loaded.paper.id = "custom";
                change(activateLabelSet(loaded, loaded.outputLanguage, loaded.activeGroup ?? group));
              } catch {
                setNotice(t("error"));
              }
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <div className="hm-status" role="status">
        {notice || (busy ? t("working") : "")}
      </div>
      <div className="hm-grid" inert={busy}>
        <div className="hm-editor">
          <section className="hm-panel">
            <h2>
              <span>01</span>
              {t("items")}
            </h2>
            <div className="hm-row">
              <label>
                {t("output")}
                <select
                  aria-label={t("output")}
                  value={project.outputLanguage}
                  onChange={(e) =>
                    change(
                      activateLabelSet(
                        committed.current,
                        e.target.value,
                        group,
                      ),
                    )
                  }
                >
                  {homeLanguages.map((l) => (
                    <option key={l} value={l}>
                      {languageName(l)}
                    </option>
                  ))}
                </select>
              </label>
              {!englishKitchen && (
                <label className="hm-check">
                  <input
                    type="checkbox"
                    checked={project.bilingual}
                    onChange={(e) => patch({ bilingual: e.target.checked })}
                  />
                  {t("bilingual")}
                </label>
              )}
            </div>
            <div className="hm-tabs">
              {(["kitchen", "boxes"] as const).map((k, i) => (
                <button
                  key={k}
                  aria-pressed={group === i}
                  onClick={() => {
                    change(
                      activateLabelSet(
                        committed.current,
                        project.outputLanguage,
                        i,
                      ),
                    );
                  }}
                >
                  {t(k)}
                </button>
              ))}
            </div>
            <div className="hm-chips">
              {choices.map((item) => (
                <div
                  key={englishKitchen ? quantityKey(item) : labelKey(item)}
                  className={
                    "hm-chip" + (item.quantity > 0 ? " hm-chip-selected" : "")
                  }
                  data-label-name={item.name}
                  data-quantity={item.quantity}
                >
                  <button
                    type="button"
                    aria-label={"− " + item.name}
                    disabled={!item.quantity}
                    onClick={() => setQuantity(item, item.quantity - 1)}
                  >
                    −
                  </button>
                  <div className="hm-chip-content">
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="1"
                      aria-label={t("quantity") + " · " + item.name}
                      value={item.quantity}
                      onChange={(e) => {
                        if (e.target.value !== "")
                          setQuantity(item, Number(e.target.value));
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "")
                          e.target.value = String(item.quantity);
                      }}
                    />
                    <span className="hm-chip-name" dir="auto">
                      <BadgeNameInput value={item.name} label={t("name") + " · " + item.name}
                        onChange={name => {
                          try { change(withName(committed.current, item, name)); }
                          catch { setNotice(t("error")); }
                        }} />
                      {project.bilingual &&
                        item.second &&
                        item.bestBefore === undefined && (
                          <small>{item.second}</small>
                        )}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={"＋ " + item.name}
                    disabled={total >= 500}
                    onClick={() => setQuantity(item, item.quantity + 1)}
                  >
                    ＋
                  </button>
                </div>
              ))}
            </div>
            {englishKitchen && (
              <div className="hm-kitchen-date">
                <p id="hm-kitchen-date-title">{t("kitchenDate")}</p>
                <div
                  className="hm-date-options"
                  style={
                    {
                      "--hm-date-color": dateHighlightColor,
                    } as React.CSSProperties
                  }
                  aria-labelledby="hm-kitchen-date-title"
                >
                  {dateBadges.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      className="hm-date-badge"
                      data-date-id={badge.id}
                      data-selected={badge.id === project.selectedKitchenDate}
                      aria-pressed={badge.id === project.selectedKitchenDate}
                      onClick={() => {
                        if (committed.current.selectedKitchenDate !== badge.id)
                          patch({ selectedKitchenDate: badge.id });
                      }}
                    >
                      {badge.date}
                    </button>
                  ))}
                  {addingDate ? (
                    <form
                      className="hm-new-date"
                      aria-label={t("newDate")}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setAddingDate(false);
                      }}
                      onSubmit={(event) => {
                        event.preventDefault();
                        try {
                          change(addDate(committed.current, draftDate));
                          setAddingDate(false);
                        } catch {
                          setNotice(t("error"));
                        }
                      }}
                    >
                      <input
                        type="date"
                        autoFocus
                        required
                        min="0001-01-01"
                        max="9999-12-31"
                        aria-label={t("newDate")}
                        value={draftDate}
                        onChange={(event) => setDraftDate(event.target.value)}
                      />
                      <button
                        type="submit"
                        className="hm-add-date"
                        disabled={!draftDate}
                      >
                        {t("addDate")}
                      </button>
                      <button
                        type="button"
                        className="hm-add-date"
                        onClick={() => setAddingDate(false)}
                      >
                        {t("cancelDate")}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="hm-add-date"
                      disabled={dateBadges.length >= 200}
                      onClick={() => {
                        setDraftDate(sixMonthsFrom());
                        setAddingDate(true);
                      }}
                    >
                      {t("addDate")}
                    </button>
                  )}
                </div>
              </div>
            )}
            <label className="hm-input-label">
              {t("items")}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={10000}
                placeholder={presets
                  .slice(0, 3)
                  .map((item) => item.name)
                  .join("\n")}
              />
            </label>
            <p className="hm-hint">{t("listHelp")}</p>
            <div className="hm-actions">
              <button
                className="hm-primary"
                disabled={!input.trim() || busy}
                onClick={() => {
                  try {
                    add(
                      parseList(input).map((item) =>
                        englishKitchen
                          ? {
                              ...item,
                              name: item.name.toUpperCase(),
                              second: "",
                              bestBefore: "",
                            }
                          : item,
                      ),
                    );
                  } catch {
                    setNotice(t("error"));
                  }
                }}
              >
                {t("add")}
              </button>
              <button
                className={recording ? "hm-voice hm-recording" : "hm-voice"}
                onClick={speak}
                disabled={busy}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {recording ? (
                    <rect
                      x="6"
                      y="6"
                      width="12"
                      height="12"
                      rx="1"
                      fill="currentColor"
                      stroke="none"
                    />
                  ) : (
                    <>
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
                    </>
                  )}
                </svg>
                <span>{recording ? t("stop") : t("voice")}</span>
              </button>
            </div>
            <p className="hm-hint">
              {t("voiceNote")}
              {!cloud ? " " + t("listHelp") : ""}
            </p>
          </section>
          <section className="hm-panel">
            <h2>
              <span>02</span>
              {t("paper")}
            </h2>
            <label>
              {t("region")}
              <select
                aria-label={t("region")}
                value={project.region}
                onChange={(e) => {
                  regionLocked.current = true;
                  try {
                    localStorage.setItem(REGION_STORE, e.target.value);
                  } catch {}
                  patch({ region: e.target.value });
                }}
              >
                <option value="">{t("unknown")}</option>
                <optgroup label={t("suggested")}>
                  {regions.suggested.map((code) => (
                    <option key={code} value={code}>
                      {displayRegions.of(code)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("allRegions")}>
                  {regions.remaining.map((code) => (
                    <option key={code} value={code}>
                      {displayRegions.of(code)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <p className="hm-hint">{t("regionHint")}</p>
            <div className="hm-paper-suggestions" aria-label={t("suggested")}>
              <span>{t("suggested")}</span>
              {sorted.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={project.paper.id === p.id}
                  onClick={() => selectPaper(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <div className="hm-row">
              <label>
                {t("all")}
                <select
                  aria-label={t("all")}
                  data-testid="home-paper"
                  value={project.paper.id}
                  onChange={(e) => selectPaper(e.target.value)}
                >
                  {sorted.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="custom">{t("custom")}</option>
                </select>
              </label>
              <button
                onClick={() =>
                  patch({
                    paper: {
                      ...project.paper,
                      id: "custom",
                      name: t("custom"),
                    },
                  })
                }
              >
                {t("custom")}
              </button>
            </div>
            <p className="hm-hint">{t("allNote")}</p>
            <details open={project.paper.id === "custom"}>
              <summary>{t("custom")} · mm</summary>
              <div className="hm-fields">
                <label>
                  {t("page")} ↔ mm
                  <input
                    aria-label={t("page") + " width"}
                    type="number"
                    min={5}
                    max={500}
                    step="0.1"
                    value={project.paper.pageWidth}
                    onChange={(e) =>
                      patch({
                        paper: {
                          ...project.paper,
                          id: "custom",
                          pageWidth: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  {t("page")} ↕ mm
                  <input
                    aria-label={t("page") + " height"}
                    type="number"
                    min={5}
                    max={500}
                    step="0.1"
                    value={project.paper.pageHeight}
                    onChange={(e) =>
                      patch({
                        paper: {
                          ...project.paper,
                          id: "custom",
                          pageHeight: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  {t("label")} ↔ mm
                  <input
                    aria-label={t("label") + " width"}
                    type="number"
                    min={5}
                    max={500}
                    step="0.1"
                    value={project.paper.width}
                    onChange={(e) =>
                      patch({
                        paper: {
                          ...project.paper,
                          id: "custom",
                          width: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  {t("label")} ↕ mm
                  <input
                    aria-label={t("label") + " height"}
                    type="number"
                    min={5}
                    max={500}
                    step="0.1"
                    value={project.paper.height}
                    onChange={(e) =>
                      patch({
                        paper: {
                          ...project.paper,
                          id: "custom",
                          height: Number(e.target.value),
                        },
                      })
                    }
                  />
                </label>
                {paperField("columns", "columns", 1, 50, 1)}
                {paperField("rows", "rows", 1, 50, 1)}
                {paperField("left", "left")}
                {paperField("top", "top")}
                {paperField("gapX", "gapX")}
                {paperField("gapY", "gapY")}
                <label>
                  {t("shape")}
                  <select
                    aria-label={t("shape")}
                    value={project.paper.shape}
                    onChange={(e) =>
                      patch({
                        paper: {
                          ...project.paper,
                          id: "custom",
                          shape: e.target.value as Paper["shape"],
                        },
                      })
                    }
                  >
                    <option value="rectangle">{t("rectangle")}</option>
                    <option value="round">{t("round")}</option>
                  </select>
                </label>
              </div>
            </details>
            <p className="hm-hint">{t("layoutNote")}</p>
            <div className="hm-row">
              <label>
                {t("style")}
                <select
                  aria-label={t("style")}
                  value={project.style}
                  onChange={(e) =>
                    patch({ style: e.target.value as HomeProject["style"] })
                  }
                >
                  <option value="simple">{t("simple")}</option>
                  <option value="frame">{t("frame")}</option>
                </select>
              </label>
              {(["offsetX", "offsetY"] as const).map((k) => (
                <label key={k}>
                  {t(k)} · mm
                  <AdjustmentInput
                    value={project[k]}
                    onChange={(value) => patch({ [k]: value })}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
        <section className="hm-panel hm-preview-panel">
          <h2>
            <span>03</span>
            {t("preview")} <small>{total} ×</small>
          </h2>
          {screenPreview.controls}
          {screenPreview.physical && (
            <p className="hm-hint" dir="ltr">
              {project.paper.pageWidth} × {project.paper.pageHeight} mm
            </p>
          )}
          {view.error ? (
            <p role="alert">{t("error")}</p>
          ) : !view.html ? (
            <p className="hm-empty">{t("empty")}</p>
          ) : (
            <div className="hm-preview">
              <iframe
                ref={frame}
                title={t("preview")}
                sandbox="allow-same-origin"
                srcDoc={view.html}
                onLoad={() => {
                  const doc = frame.current?.contentDocument;
                  if (doc) {
                    doc
                      .querySelectorAll<HTMLElement>(".sheet")
                      .forEach(
                        (s, i) =>
                          (s.style.display = i === page - 1 ? "block" : "none"),
                      );
                    resizePreview();
                    decoratePreview();
                  }
                }}
              />
            </div>
          )}
          {pageCount > 1 && (
            <div className="hm-pager">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                  frame.current?.contentDocument
                    ?.querySelectorAll<HTMLElement>(".sheet")
                    .forEach(
                      (s, i) =>
                        (s.style.display = i === page - 2 ? "block" : "none"),
                    );
                }}
              >
                ←
              </button>
              <span>
                {page} / {pageCount}
              </span>
              <button
                disabled={page >= pageCount}
                onClick={() => {
                  setPage(page + 1);
                  frame.current?.contentDocument
                    ?.querySelectorAll<HTMLElement>(".sheet")
                    .forEach(
                      (s, i) =>
                        (s.style.display = i === page ? "block" : "none"),
                    );
                }}
              >
                →
              </button>
            </div>
          )}
          <p className="hm-hint">{t("printNote")}</p>
          <div className="hm-actions">
            <button
              className="hm-primary"
              disabled={!total || !view.html || view.error || busy}
              onClick={() => print(false)}
            >
              {t("print")}
            </button>
            <button
              disabled={!total || !view.html || view.error || busy}
              onClick={() => print(true)}
            >
              {t("pdf")}
            </button>
            <button
              disabled={view.error || busy}
              onClick={() => print(false, true)}
            >
              {t("test")}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
