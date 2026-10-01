"use client";

import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";

/*
 * A number field that shows Danish formatting while you type: 100000 becomes
 * 100.000 and decimals use a comma (4,5). The caret stays where you are typing.
 * Use group={false} for numbers that must not be grouped: postnummer, byggeår.
 */

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string | null | undefined;
  onValueChange: (n: number | null) => void;
  /** Decimal places allowed (0 = whole numbers). */
  decimals?: number;
  /** Thousands separators. Off for postnumre and years. */
  group?: boolean;
};

const toNumber = (s: string): number | null => {
  const clean = s.replace(/\./g, "").replace(",", ".").trim();
  if (clean === "" || clean === "-" || clean === ".") return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};

/** Format the raw text the user typed, keeping a trailing comma or zeros they are still typing. */
function formatRaw(raw: string, decimals: number, group: boolean): string {
  const neg = raw.trim().startsWith("-");
  let s = raw.replace(/[^\d,]/g, "");
  const comma = decimals > 0 ? s.indexOf(",") : -1;
  let int = comma >= 0 ? s.slice(0, comma) : s.replace(/,/g, "");
  const frac = comma >= 0 ? s.slice(comma + 1).replace(/,/g, "").slice(0, decimals) : "";
  int = int.replace(/^0+(?=\d)/, "");
  if (group) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  s = int + (comma >= 0 ? "," + frac : "");
  return (neg ? "-" : "") + s;
}

function formatValue(v: number | string | null | undefined, decimals: number, group: boolean): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : toNumber(String(v));
  if (n === null || !Number.isFinite(n)) return "";
  const fixed = decimals > 0 ? String(Math.round(n * 10 ** decimals) / 10 ** decimals) : String(Math.round(n));
  return formatRaw(fixed.replace(".", ","), decimals, group);
}

export const NumberInput = forwardRef<HTMLInputElement, Props>(function NumberInput(
  { value, onValueChange, decimals = 0, group = true, inputMode, ...rest },
  ref,
) {
  const inner = useRef<HTMLInputElement | null>(null);
  const [text, setText] = useState(() => formatValue(value, decimals, group));
  const caret = useRef<number | null>(null);

  // Follow outside changes (a reset, a value loaded from a listing) without
  // fighting the user while they type the same number.
  useEffect(() => {
    const current = toNumber(text);
    const incoming = value === "" || value == null ? null : typeof value === "number" ? value : toNumber(String(value));
    if (current !== incoming) setText(formatValue(value, decimals, group));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (caret.current != null && inner.current) {
      inner.current.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <input
      {...rest}
      ref={(el) => {
        inner.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      type="text"
      inputMode={inputMode ?? (decimals > 0 ? "decimal" : "numeric")}
      autoComplete={rest.autoComplete ?? "off"}
      value={text}
      onChange={(e) => {
        const el = e.target;
        // A "." typed at the end of a decimal field means a decimal point (4.5 → 4,5);
        // anywhere else dots are our own thousands separators.
        const raw = decimals > 0 && el.value.endsWith(".") && !el.value.includes(",") ? el.value.slice(0, -1) + "," : el.value;
        // Where the caret is, counted in digits (and the comma), survives regrouping.
        const pos = el.selectionStart ?? raw.length;
        let before = raw.slice(0, pos).replace(/[^\d,]/g, "").length;
        let src = raw;
        // Backspace over one of our thousands dots: delete the digit in front of it,
        // or the field would just put the dot back and the caret would be stuck.
        const keep = (t: string) => t.replace(/[^\d,-]/g, "");
        if (keep(raw) === keep(text) && raw.length < text.length && before > 0) {
          const d = keep(raw);
          const at = (raw.startsWith("-") ? 1 : 0) + before;
          src = d.slice(0, at - 1) + d.slice(at);
          before -= 1;
        }
        const next = formatRaw(src, decimals, group);
        let seen = 0;
        let idx = next.length;
        for (let i = 0; i < next.length; i++) {
          if (seen === before) { idx = i; break; }
          if (/[\d,]/.test(next[i])) seen++;
        }
        caret.current = before === 0 ? (next.startsWith("-") ? 1 : 0) : idx;
        setText(next);
        onValueChange(toNumber(next));
      }}
    />
  );
});
