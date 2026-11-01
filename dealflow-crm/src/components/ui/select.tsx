"use client";

import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { SearchSelect, type SearchOption } from "./search-select";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function collectOptions(children: ReactNode, out: SearchOption[] = []): SearchOption[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ value?: string | number; children?: ReactNode; disabled?: boolean; label?: string }>;
    if (el.type === Fragment || el.type === "optgroup") {
      collectOptions(el.props.children, out);
      return;
    }
    if (el.type === "option") {
      const label = textOf(el.props.children).replace(/\s+/g, " ").trim();
      out.push({ value: String(el.props.value ?? label), label: label || String(el.props.value ?? ""), disabled: el.props.disabled });
    }
  });
  return out;
}

type Props = {
  value?: string | number;
  onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  placeholder?: string;
  /** Remember recent picks for this list. */
  recentKey?: string;
};

/**
 * Drop-in replacement for a native <select>: same <option> children and onChange(e) shape,
 * but renders the searchable SearchSelect. Options with an empty value act as the "all / none" choice.
 */
export function Select({ value, onChange, children, className, disabled, id, name, placeholder, recentKey, ...rest }: Props) {
  const options = collectOptions(children);
  const v = value == null ? "" : String(value);
  const empty = options.find((o) => o.value === "");
  return (
    <>
      <SearchSelect
        id={id}
        value={v}
        options={options}
        disabled={disabled}
        recentKey={recentKey}
        ariaLabel={rest["aria-label"] ?? placeholder ?? empty?.label}
        placeholder={placeholder ?? empty?.label ?? "Search…"}
        className={className}
        onChange={(nv) => onChange?.({ target: { value: nv }, currentTarget: { value: nv } })}
      />
      {name ? <input type="hidden" name={name} value={v} /> : null}
    </>
  );
}
