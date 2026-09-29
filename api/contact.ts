/**
 * Contact-form submit endpoint for the footer's "Let's Talk" modal
 * (src/pieces/ContactModal.tsx). A Vercel Edge Function — no extra runtime,
 * no SDK dependency — that relays the submission to Resend's REST API.
 *
 * Every email's subject is tagged "[Portfolio Reachout]" so a one-time
 * Gmail filter (Settings → Filters and Blocked Addresses → Create filter →
 * Subject contains "[Portfolio Reachout]" → Apply label "portfolio
 * reachout") files every entry under that label automatically.
 *
 * Required environment variables (set in the Vercel project, not committed):
 *   RESEND_API_KEY    - from resend.com
 *   CONTACT_TO_EMAIL  - where entries are delivered (defaults to
 *                        pateldvija20@gmail.com)
 *   CONTACT_FROM_EMAIL - the Resend-verified sender address. Resend's
 *                        shared onboarding@resend.dev works before you've
 *                        verified your own domain, but for delivery to a
 *                        personal Gmail account you'll want a domain you
 *                        own verified in Resend.
 *
 * See .env.example for the full list.
 */

export const config = { runtime: "edge" };

const TO_EMAIL = "pateldvija20@gmail.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const project = String(body.project ?? "").trim();
  const timeline = String(body.timeline ?? "").trim();
  const source = String(body.source ?? "").trim();

  if (!firstName || !lastName || !email || !project || !timeline || !source) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Contact form is not configured yet" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const toEmail = process.env.CONTACT_TO_EMAIL || TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL || "Portfolio Reachout <onboarding@resend.dev>";

  const fields = [
    ["Name", `${firstName} ${lastName}`],
    ["Email", email],
    ["Business / project", project],
    ["Preferred timeline", timeline],
    ["Found via", source],
  ] as const;

  const html = `
    <h2>New portfolio reachout</h2>
    <table cellpadding="6" cellspacing="0">
      ${fields
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value).replace(/\n/g, "<br/>")}</td></tr>`,
        )
        .join("")}
    </table>
  `;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: email,
      subject: `[Portfolio Reachout] ${firstName} ${lastName}`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    console.error("Resend send failed:", detail);
    return new Response(JSON.stringify({ error: "Failed to send" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
