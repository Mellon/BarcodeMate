import React from "react";
import { text } from "./i18n";

export function RackDiagram({ language }: { language: string }) {
  const t = (key: Parameters<typeof text>[1]) => text(language, key);
  return (
    <figure className="wh-rack-diagram" aria-label={t("rackDiagram")}>
      <svg viewBox="0 0 300 180" role="img" aria-label={t("rackDiagram")}>
        {/* A highlighted level contains several separate bins. */}
        <rect
          x="65"
          y="76"
          width="152"
          height="37"
          rx="3"
          fill="#e2ebd8"
          stroke="#95aa7f"
          strokeDasharray="3 3"
        />
        {[40, 80, 120].map((y) => (
          <g key={y}>
            {[73, 119, 165].map((x) => (
              <g key={x}>
                <path
                  d={`M${x} ${y + 7}h38l-2 23h-34Z`}
                  fill={x === 165 && y === 80 ? "#91b69a" : "#f2eadc"}
                  stroke={x === 165 && y === 80 ? "#37654a" : "#bbaf99"}
                  strokeWidth="1.3"
                />
                <path
                  d={`M${x + 3} ${y + 7}l3-5h26l3 5`}
                  fill="#faf6ee"
                  stroke="#bbaf99"
                  strokeWidth="1.2"
                />
                <rect
                  x={x + 12}
                  y={y + 15}
                  width="14"
                  height="6"
                  rx="1"
                  fill="#fff"
                />
              </g>
            ))}
            <rect
              x="64"
              y={y + 31}
              width="154"
              height="5"
              rx="1"
              fill="#7c8c85"
            />
          </g>
        ))}
        <path
          d="M64 38v123m153-123v123M64 38h153"
          fill="none"
          stroke="#586e61"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M58 163h12m141 0h12"
          stroke="#586e61"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g
          fill="none"
          stroke="#526c5b"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M44 22h10l10 16" />
          <path d="M237 63h-9l-13 30" />
          <path d="M237 135h-9l-44-39" />
        </g>
        <g fill="#526c5b">
          <circle cx="64" cy="38" r="2.5" />
          <circle cx="215" cy="93" r="2.5" />
          <circle cx="184" cy="96" r="2.5" />
        </g>
        <g fill="#355240" fontSize="12" fontWeight="650" fontFamily="inherit">
          <text x="12" y="19">
            {t("rackTerm")}
          </text>
          <text x="239" y="66">
            {t("levelTerm")}
          </text>
          <text x="239" y="139">
            {t("binTerm")}
          </text>
        </g>
      </svg>
      <figcaption className="wh-sr">{t("rackDiagram")}</figcaption>
    </figure>
  );
}
