import { checkDigit } from "./barcode";
export function wifi(
  ssid: string,
  password: string,
  security = "WPA",
  hidden = false,
) {
  const escape = (s: string) => s.replace(/[\\;,:\"]/g, "\\$&");
  if (!ssid) throw Error("Enter a network name.");
  return `WIFI:T:${security};S:${escape(ssid)};P:${escape(password)};H:${hidden};;`;
}
export function vcard(
  name: string,
  organization: string,
  phone: string,
  email: string,
  url: string,
) {
  const clean = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
  if (!name) throw Error("Enter a name.");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${clean(name)}`,
    `N:;${clean(name)};;;`,
    `ORG:${clean(organization)}`,
    `TEL:${clean(phone)}`,
    `EMAIL:${clean(email)}`,
    `URL:${clean(url)}`,
    "END:VCARD",
  ].join("\r\n");
}
export function gs1(gtin: string, lot: string, expiry: string, serial: string) {
  if (!/^\d{13,14}$/.test(gtin))
    throw Error(
      "GTIN needs 13 digits plus a calculated check digit, or 14 digits including the check digit.",
    );
  if (gtin.length === 13) gtin += checkDigit(gtin);
  else if (checkDigit(gtin.slice(0, -1)) !== gtin.at(-1))
    throw Error("GTIN check digit is incorrect.");
  if (expiry && !/^\d{6}$/.test(expiry))
    throw Error("Expiration date format: YYMMDD.");
  if (
    lot.length > 20 ||
    serial.length > 20 ||
    /[()\x00-\x1f]/.test(lot + serial)
  )
    throw Error(
      "Lot and serial: at most 20 characters, without parentheses or control characters.",
    );
  return `(01)${gtin}${expiry ? `(17)${expiry}` : ""}${lot ? `(10)${lot}` : ""}${serial ? `(21)${serial}` : ""}`;
}
