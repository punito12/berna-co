// Reusable brand logo box. Mirrors the physical catalog mark:
//   • FROM C. S. BERNA KITCHEN •
//   ▌ BERNA & CO
//     CONGELADOS CASEROS
// Uses border-current so it adapts to the surrounding text color.

type BernaLogoProps = {
  // "light" = white mark for dark backgrounds; "dark" = black mark for light.
  variant?: "light" | "dark";
  size?: "sm" | "lg";
  className?: string;
};

export default function BernaLogo({
  variant = "dark",
  size = "lg",
  className = "",
}: BernaLogoProps) {
  const color = variant === "light" ? "text-white" : "text-ink";
  const padding = size === "lg" ? "p-5 sm:p-6" : "p-3";
  const titleSize = size === "lg" ? "text-3xl sm:text-4xl" : "text-xl";
  const kickerSize = size === "lg" ? "text-[10px] sm:text-xs" : "text-[9px]";
  const subSize = size === "lg" ? "text-xs sm:text-sm" : "text-[10px]";

  return (
    <div
      className={`inline-block border-2 border-current ${color} ${padding} ${className}`}
    >
      <div
        className={`flex items-center justify-center gap-2 font-bold uppercase tracking-[0.2em] ${kickerSize}`}
      >
        <span aria-hidden>•</span>
        <span>From C. S. Berna Kitchen</span>
        <span aria-hidden>•</span>
      </div>

      <div className={`mt-3 flex items-center gap-3 ${titleSize}`}>
        <span aria-hidden className="block w-1.5 self-stretch bg-current" />
        <span className="font-black uppercase tracking-tight leading-none">
          Berna&nbsp;&amp;&nbsp;Co
        </span>
      </div>

      <div
        className={`mt-1 pl-[18px] font-bold uppercase tracking-[0.3em] ${subSize}`}
      >
        Congelados Caseros
      </div>
    </div>
  );
}
