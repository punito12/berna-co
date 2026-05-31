// Newsletter subscription logic.
import { prisma } from "@/lib/db";

// Minimal email shape check — good enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class NewsletterError extends Error {}

// Adds an email to the newsletter. Idempotent: re-subscribing the same email
// is treated as success (no duplicate, no error).
export async function subscribe(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new NewsletterError("Ingresá un email válido.");
  }
  await prisma.subscriber.upsert({
    where: { email },
    update: {}, // already subscribed → leave as is
    create: { email },
  });
}

// All subscribers, newest first (for the admin list / CSV export).
export async function listSubscribers() {
  return prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });
}
