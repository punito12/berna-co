import { listSubscribers } from "@/lib/newsletter";

// Newsletter subscribers list + CSV export link.
export default async function AdminNewsletterPage() {
  const subscribers = await listSubscribers();

  const dateFmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-black uppercase tracking-tight text-3xl text-ink">
          Newsletter
        </h1>
        {subscribers.length > 0 && (
          <a
            href="/api/admin/newsletter/export"
            className="bg-black px-5 py-2.5 font-bold uppercase tracking-widest text-xs text-white"
          >
            Descargar CSV
          </a>
        )}
      </div>
      <p className="mb-6 text-sm text-muted">
        {subscribers.length} suscripto{subscribers.length === 1 ? "" : "s"} desde
        el formulario del sitio.
      </p>

      {subscribers.length === 0 ? (
        <p className="rounded-lg border border-line bg-white px-4 py-12 text-center font-bold uppercase tracking-wide text-muted">
          Todavía no hay suscriptos.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-cream/60">
              <tr>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-muted">
                  Email
                </th>
                <th className="px-4 py-3 font-bold uppercase tracking-wide text-[11px] text-muted">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 text-ink">{s.email}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {dateFmt.format(s.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
