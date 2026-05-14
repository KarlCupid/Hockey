import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  tone = "secondary",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ButtonTone; children: ReactNode }) {
  return (
    <button className={`ui-button ui-button--${tone} ${className}`.trim()} type={props.type ?? "button"} {...props}>
      {children}
    </button>
  );
}
