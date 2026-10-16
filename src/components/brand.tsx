// La marca: tres niveles apilados (plataforma, distribuidores, clientes).
export function Mark({ tone = "dark", size = 28 }: { tone?: "dark" | "light"; size?: number }) {
  const top = tone === "light" ? "#10283A" : "#9DBBD3";
  const mid = tone === "light" ? "#2A62C9" : "#5B93F2";
  const low = tone === "light" ? "#087A56" : "#1FBF8F";
  return (
    <svg
      width={size}
      height={(size * 22) / 28}
      viewBox="0 0 28 22"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="28" height="6" rx="1.5" fill={top} />
      <rect x="5" y="8" width="23" height="6" rx="1.5" fill={mid} />
      <rect x="10" y="16" width="18" height="6" rx="1.5" fill={low} />
    </svg>
  );
}

export function Logo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span className={`logo logo--${tone}`}>
      <Mark tone={tone} />
      <span className="logo__word">EzerPro</span>
    </span>
  );
}
