import React from "react";

export function PrinterIcon({ thermal = false }: { thermal?: boolean }) {
  return (
    <svg
      className="wh-printer-icon"
      width="52"
      height="52"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {thermal ? (
        <g stroke="#535e60" strokeWidth="1.25">
          {/* Rounded Zebra-style enclosure, seen from the front-left. */}
          <path
            d="M9 16Q10 11 16 9L40 4Q46 3 51 9L58 20Q61 25 61 31V47Q61 53 55 55L24 61Q18 62 14 56L5 43Q3 40 4 32Z"
            fill="#8b9594"
          />
          <path
            d="M9 16Q10 11 16 9L40 4Q46 3 51 9L58 20L23 29Q18 30 17 36L5 29Z"
            fill="#c3cac7"
          />
          <path
            d="M5 29L17 36V55Q17 58 21 61Q17 61 14 56L5 43Q3 40 4 32Z"
            fill="#a4aeaa"
          />
          <path
            d="M23 25L52 19Q60 18 61 28V47Q61 53 55 55L24 61Q18 62 17 54V34Q17 27 23 25Z"
            fill="#697475"
          />
          <path
            d="M24 28L52 22Q57 21 58 27V41L20 49V35Q20 29 24 28Z"
            fill="#525d60"
          />
          <path d="M20 49L58 41M8 36L17 42" stroke="#3f494c" />
          {/* Sloped control panel and rear roll-cover seam. */}
          <path d="M17 11L40 6Q43 6 45 8L20 14Z" fill="#414c4f" stroke="none" />
          <path d="M25 14L42 10L48 17L31 21Z" fill="#6c7c7e" stroke="#8f9a97" />
          <path d="M29 15L40 12L44 16L33 19Z" fill="#a8bcc0" stroke="none" />
          <path d="M28 12L32 11" stroke="#8caf69" strokeWidth="1.5" />
          <path d="M47 11L49 13M49 14L51 16" stroke="#f0f2ef" />
          {/* Side release latch and the short label emerging from the front slot. */}
          <path
            d="M9 33L12 35V43L9 41Z"
            fill="#e1b846"
            stroke="#b28b30"
            strokeWidth="0.8"
          />
          <path d="M25 45L50 40V44L25 49Z" fill="#283438" stroke="none" />
          <path
            d="M29 45L45 42L48 53L32 56Z"
            fill="#fff"
            stroke="#c7cdca"
            strokeWidth="0.8"
          />
          <g
            transform="matrix(1 -.19 .27 1 31 46)"
            stroke="#465052"
            strokeLinecap="butt"
            strokeWidth="0.85"
          >
            <path d="M0 0v7m2-7v7m1.5-7v7m2.5-7v7m1.5-7v7m2.5-7v7m2-7v7" />
          </g>
        </g>
      ) : (
        <g stroke="#7d8785" strokeWidth="1.1">
          {/* Unbranded desktop laser printer with a recessed top output tray. */}
          <path
            d="M7 19L21 6L60 10V43L48 58L8 55Q6 55 6 52V22Q6 20 7 19Z"
            fill="#c6ccca"
          />
          <path d="M48 23L60 10V43L48 58Z" fill="#b4bdba" />
          <path d="M7 19L21 6L60 10L48 23Z" fill="#edf0ed" />
          <path
            d="M7 19L48 23V56Q48 60 44 59L33 57V54L22 53V56L9 55Q6 55 6 52V22Q6 20 7 19Z"
            fill="#dce1dd"
          />
          {/* The dark opening and inner ledge distinguish the top-fed output. */}
          <path d="M15 17L25 9L55 12L45 21Z" fill="#515b5b" stroke="#929b98" />
          <path d="M25 11L51 14L45 18L24 16Z" fill="#2e383b" stroke="none" />
          <path d="M24 16L45 18L43 20L22 18Z" fill="#86908e" stroke="none" />
          <path
            d="M29 15L30 12M33 16L34 13M42 17L43 14"
            stroke="#b0b8b3"
            strokeWidth="0.8"
          />
          <path d="M15 16L19 16.5" stroke="#a7b798" strokeWidth="1.5" />
          {/* Blank access door, paper drawer and side ventilation. */}
          <path
            d="M13 24L41 27Q45 27 45 31V43L10 40V28Q10 24 13 24Z"
            fill="#e5e8e4"
            stroke="#9ca6a0"
          />
          <path d="M24 25L34 26V28L24 27Z" fill="#a3ada7" stroke="none" />
          <path d="M7 42L48 46M48 46L58 35" stroke="#949f98" />
          <path d="M22 50L34 51V54L22 53Z" fill="#939e97" stroke="none" />
          <path d="M42 50V54" stroke="#667570" strokeWidth="1.3" />
          <path
            d="M54 21L58 17M54 24L58 20M54 27L58 23M54 30L58 26"
            stroke="#788681"
            strokeWidth="0.9"
          />
        </g>
      )}
    </svg>
  );
}
