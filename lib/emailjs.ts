import "server-only";

export type EmailJsSendResult = {
  ok: boolean;
  status?: number;
  reason?: "missing_config" | "rejected" | "timeout" | "network";
};

export type EmailJsTemplateParams = {
  from_name: string;
  from_email: string;
  phone: string;
  service: string;
  project_type: string;
  budget: string;
  timeline: string;
  date: string;
  time: string;
  message: string;
  to_name: string;
  reply_to: string;
  reference_id: string;
};

export function isEmailJsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID &&
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID &&
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY,
  );
}

export async function sendViaEmailJs(params: EmailJsTemplateParams): Promise<EmailJsSendResult> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) {
    return { ok: false, reason: "missing_config" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: params,
      }),
    });
    if (!res.ok) {
      return { ok: false, status: res.status, reason: "rejected" };
    }
    return { ok: true, status: res.status };
  } catch (error) {
    const aborted =
      (error instanceof Error && error.name === "AbortError") ||
      (error instanceof DOMException && error.name === "AbortError");
    return { ok: false, reason: aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
