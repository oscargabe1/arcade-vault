import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "20px 32px",
        textAlign: "center",
        color: "var(--ink-faint)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.16em",
      }}
    >
      <Link href="/about" style={{ color: "var(--ink-dim)", marginRight: 16 }}>
        ACERCA DE
      </Link>
      © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
    </footer>
  );
}
