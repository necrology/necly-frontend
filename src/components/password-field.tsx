"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField({ id, name, label, autoComplete, placeholder = "At least 8 characters", error }: { id: string; name: string; label: string; autoComplete: string; placeholder?: string; error?: string }) {
  const [show, setShow] = useState(false);
  return <div className="field"><label className="label" htmlFor={id}>{label}</label><div className="input-wrap"><input className="input" style={{ paddingLeft: 12, paddingRight: 48 }} id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={Boolean(error)} /><button className="password-toggle" type="button" onClick={() => setShow((value) => !value)} aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{error && <span className="field-error" role="alert">{error}</span>}</div>;
}
