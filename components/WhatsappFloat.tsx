import { BUSINESS_WHATSAPP } from "@/lib/whatsapp";

// Fixed WhatsApp button in the bottom-right corner. Opens a chat with the shop.
// Static (always visible); no order context, just a generic greeting.
export default function WhatsappFloat() {
  const text = encodeURIComponent("¡Hola Berna&co! Tengo una consulta 🙂");
  const href = `https://wa.me/${BUSINESS_WHATSAPP}?text=${text}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactanos por WhatsApp"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-white shadow-lg transition-transform hover:scale-105"
    >
      {/* WhatsApp glyph (inline SVG, no extra deps) */}
      <svg
        viewBox="0 0 32 32"
        className="h-6 w-6 fill-current"
        aria-hidden="true"
      >
        <path d="M16.004 3C9.383 3 4 8.383 4 15.004c0 2.114.553 4.174 1.602 5.996L4 29l8.18-1.567a11.93 11.93 0 0 0 3.824.63h.001C22.621 28.063 28 22.68 28 16.06 28 9.44 22.621 4.06 16.004 3zm0 21.86h-.001a9.9 9.9 0 0 1-3.385-.612l-.243-.09-4.854.93.99-4.73-.158-.243a9.85 9.85 0 0 1-1.51-5.26c0-5.47 4.45-9.92 9.92-9.92 2.65 0 5.14 1.034 7.01 2.91a9.84 9.84 0 0 1 2.9 7.01c0 5.47-4.45 9.92-9.92 9.92zm5.44-7.42c-.298-.15-1.764-.87-2.037-.97-.273-.1-.472-.15-.67.15-.198.297-.768.967-.942 1.166-.173.198-.347.223-.644.074-.298-.15-1.258-.464-2.396-1.479-.886-.79-1.484-1.766-1.658-2.064-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.074-.149-.67-1.614-.917-2.21-.242-.58-.487-.502-.67-.512l-.57-.01c-.198 0-.52.074-.793.372-.273.297-1.04 1.017-1.04 2.48 0 1.464 1.065 2.878 1.213 3.076.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.764-.721 2.013-1.417.248-.696.248-1.293.173-1.417-.074-.124-.272-.198-.57-.347z" />
      </svg>
      <span className="hidden font-bold uppercase tracking-widest text-xs sm:inline">
        Contactanos
      </span>
    </a>
  );
}
