/**
 * Avatar — renders either:
 *   • An <img> if `src` is an http URL (OAuth profile photo)
 *   • A large emoji centered in a circle if `src` is a single emoji char
 *   • Initials fallback in the player's color
 */
interface AvatarProps {
  src?: string | null;
  name: string;
  color?: string;     // CSS color value e.g. "var(--color-player-sky)"
  size?: number;      // px, default 44
  className?: string;
}

function isEmoji(str: string): boolean {
  // Rough check: string is 1–2 chars and not ASCII letters/digits
  return str.length <= 4 && !/^[a-zA-Z0-9]/.test(str);
}

export function Avatar({ src, name, color = "#4a6b58", size = 44, className = "" }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1.5px solid rgba(255,255,255,0.15)",
    backgroundColor: color,
    fontSize: src && isEmoji(src) ? Math.round(size * 0.55) : Math.round(size * 0.38),
    fontWeight: 700,
    color: "white",
    lineHeight: 1,
    userSelect: "none",
  };

  if (src && src.startsWith("http")) {
    return (
      <img
        src={src}
        alt={name}
        style={{ ...style, objectFit: "cover" }}
        className={className}
        onError={(e) => {
          // Fallback to initials on load error
          const target = e.currentTarget;
          target.style.display = "none";
          const sib = target.nextElementSibling as HTMLElement | null;
          if (sib) sib.style.display = "flex";
        }}
      />
    );
  }

  if (src && isEmoji(src)) {
    return (
      <div style={style} className={className}>
        {src}
      </div>
    );
  }

  return (
    <div style={{ ...style, fontFamily: "var(--font-body)" }} className={className}>
      {initials || "?"}
    </div>
  );
}
