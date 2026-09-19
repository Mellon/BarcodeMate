import React, { useMemo, useState, useEffect } from "react";
import { render, drawingSVG } from "@bwip-js/generic";
import { Smartphone, Link, Unplug, Copy } from "lucide-react";
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
  const [expanded, setExpanded] = useState(
    !!pair.invite || pair.connection?.role === "phone",
  );
  useEffect(() => {
    if (pair.invite) setExpanded(true);
  }, [pair.invite]);
  useEffect(() => {
    if (pair.paired) setExpanded(false);
  }, [pair.paired]);
  const [code, setCode] = useState(""),
    [copied, setCopied] = useState(false);
  const s = pair.connection;
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
  const connectionText =
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
      <div className="hm-pair-bar">
        <button
          type="button"
          className="hm-pair-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <Smartphone size={18} />
          {s?.role === "phone" ? t("phone") : t("start")}
        </button>
        {s && (
          <span
            role="status"
            className={"hm-pair-state hm-pair-" + pair.status}
          >
            {connectionText}
          </span>
        )}
      </div>
      {(expanded ||
        pair.conflict ||
        pair.status === "expired" ||
        pair.storageError) && (
        <div className="hm-pair-body">
          {!s && (
            <>
              <p>{t("privacy")}</p>
              {pair.invite ? (
                <div className="hm-actions">
                  <button
                    disabled={pair.opening}
                    onClick={() => void pair.join()}
                  >
                    <Link size={16} />
                    {t("connect")}
                  </button>
                  <button disabled={pair.opening} onClick={pair.cancelJoin}>
                    {text(language, "cancelDate")}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    disabled={pair.opening}
                    onClick={() => void pair.create()}
                  >
                    <Smartphone size={16} />
                    {t("start")}
                  </button>
                  <details className="hm-pair-join">
                    <summary>{t("join")}</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void pair.join(code);
                      }}
                    >
                      <label>
                        {t("code")}
                        <input
                          aria-label={t("code")}
                          autoComplete="off"
                          inputMode="numeric"
                          pattern="[0-9 ]{8,11}"
                          maxLength={11}
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          required
                        />
                      </label>
                      <button disabled={pair.opening}>{t("connect")}</button>
                    </form>
                  </details>
                </>
              )}
              {pair.status === "failed" && <p role="alert">{t("failed")}</p>}
            </>
          )}
          {s && (
            <>
              {s.role === "owner" && !pair.paired && (
                <div className="hm-pair-invite">
                  {Date.now() < (s.inviteExpires || 0) ? (
                    <>
                      {qr && (
                        <img
                          className="hm-pair-qr"
                          src={qr}
                          alt={t("scan")}
                          width={196}
                          height={196}
                        />
                      )}
                      <div>
                        <p>{t("scan")}</p>
                        <p className="hm-pair-code" dir="ltr">
                          {s.code?.slice(0, 4)} {s.code?.slice(4)}
                        </p>
                        <p>{t("privacy")}</p>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(url);
                              setCopied(true);
                            } catch {
                              setCopied(false);
                            }
                          }}
                        >
                          <Copy size={16} />
                          {copied ? t("copied") : t("copy")}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>{t("expired")}</p>
                  )}
                </div>
              )}
              {s.role === "phone" && <p>{t("phone")}</p>}
              {pair.conflict && (
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
                  <button onClick={() => pair.resolve(true)}>
                    {t("mine")}
                  </button>
                  <button onClick={() => pair.resolve(false)}>
                    {t("remote")}
                  </button>
                </div>
              )}
              {pair.status === "expired" && <p role="alert">{t("expired")}</p>}
              {pair.status === "offline" && <p>{t("offline")}</p>}
              <button disabled={pair.opening} onClick={() => void pair.close()}>
                <Unplug size={16} />
                {t("end")}
              </button>
            </>
          )}
          {pair.storageError && <p role="alert">{t("storage")}</p>}
        </div>
      )}
    </section>
  );
}
