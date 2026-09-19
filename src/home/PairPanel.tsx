import React, { useMemo, useState } from "react";
import { render, drawingSVG } from "@bwip-js/generic";
import { Smartphone, Link, Unplug, LoaderCircle, Copy } from "lucide-react";
import type { usePairing } from "./pairing";
import messages from "./pair-messages.json";
import { text } from "./i18n";
export function PairPanel({
  pair,
  language,
}: {
  pair: ReturnType<typeof usePairing>;
  language: string;
}) {
  const t = (key: keyof typeof messages.en) =>
    (messages[language as keyof typeof messages] || messages.en)[key];
  const s = pair.connection;
  const [copied, setCopied] = useState(false);
  const invited = !!pair.invite && !s?.paired;
  const url = s?.invite
    ? `${s.origin || location.origin}/${language}/home-labels/#pair=${s.invite}`
    : "";
  const qr = useMemo(() => {
    if (!url) return "";
    try {
      return (
        "data:image/svg+xml;charset=utf-8," +
        encodeURIComponent(
          render(
            { bcid: "qrcode", text: url, scale: 3, padding: 4 },
            drawingSVG(),
          ),
        )
      );
    } catch {
      return "";
    }
  }, [url]);
  const status =
    pair.status === "synced"
      ? pair.peer
        ? t("synced")
        : pair.paired
          ? t("peerAway")
          : t("waiting")
      : t(
          pair.status in messages.en
            ? (pair.status as keyof typeof messages.en)
            : "waiting",
        );
  const summary = (p: import("./core").HomeProject) =>
    p.items
      .filter((i) => i.quantity > 0)
      .map(
        (i) =>
          `${i.name} × ${i.quantity}${i.bestBefore ? " · " + i.bestBefore : ""}`,
      )
      .join("\n");
  return (
    <section className="hm-pair" aria-label={t("start")}>
      <div className="hm-pair-body">
        {!invited && s?.role !== "phone" && !pair.paired ? (
          <div className="hm-pair-invite">
            {qr ? (
              <img
                className="hm-pair-qr"
                src={qr}
                alt={t("scan")}
                width={144}
                height={144}
              />
            ) : (
              <div className="hm-pair-placeholder" aria-label={t("preparing")}>
                <LoaderCircle size={24} />
              </div>
            )}
            <div className="hm-pair-description">
              <h2 className="hm-pair-title">{t("start")}</h2>
              <p>{t("intro")}</p>
              {url && (
                <div className="hm-pair-copy-row">
                  <button
                    className="hm-pair-copy"
                    aria-describedby="hm-pair-copy-hint"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                      } catch {
                        setCopied(false);
                      }
                    }}
                  >
                    <Copy size={14} />
                    {copied ? t("copied") : t("copy")}
                  </button>
                  <small id="hm-pair-copy-hint">{t("copyHint")}</small>
                </div>
              )}
              {!qr && (
                <span className="hm-pair-state" role="status">
                  {t(
                    pair.status === "failed" || pair.status === "offline"
                      ? "reconnecting"
                      : "preparing",
                  )}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="hm-pair-bar">
            <h2 className="hm-pair-title">
              <Smartphone size={18} />
              {s?.role === "phone" ? t("phone") : t("start")}
            </h2>
            {!invited && (
              <span
                role="status"
                className={"hm-pair-state hm-pair-" + pair.status}
              >
                {status}
              </span>
            )}
          </div>
        )}
        {invited && (
          <>
            <p>{t("privacy")}</p>
            <div className="hm-actions">
              <button disabled={pair.opening} onClick={() => void pair.join()}>
                <Link size={16} />
                {t("connect")}
              </button>
              <button disabled={pair.opening} onClick={pair.cancelJoin}>
                {text(language, "cancelDate")}
              </button>
            </div>
            {pair.status === "failed" && <p role="alert">{t("failed")}</p>}
          </>
        )}
        {pair.conflict && s && (
          <div className="hm-pair-conflict" role="alert">
            <p>{t("conflict")}</p>
            <div className="hm-pair-compare">
              <div>
                <strong>{t("mine")}</strong>
                <pre>{summary(s.draft)}</pre>
              </div>
              <div>
                <strong>{t("remote")}</strong>
                <pre>{summary(pair.conflict.project)}</pre>
              </div>
            </div>
            <p>{t("review")}</p>
            <button onClick={() => pair.resolve(true)}>{t("mine")}</button>
            <button onClick={() => pair.resolve(false)}>{t("remote")}</button>
          </div>
        )}
        {s && (pair.paired || s.role === "phone") && (
          <button disabled={pair.opening} onClick={() => void pair.close()}>
            <Unplug size={16} />
            {t("end")}
          </button>
        )}
        {pair.storageError && <p role="alert">{t("storage")}</p>}
      </div>
    </section>
  );
}
