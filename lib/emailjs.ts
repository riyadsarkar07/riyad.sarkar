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

function cleanEnv(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]+|['"]+$/g, "").trim();
}

function emailJsCredentials() {
  return {
    serviceId: cleanEnv(process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID),
    templateId: cleanEnv(process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID),
    publicKey: cleanEnv(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY),
  };
}

export function isEmailJsConfigured(): boolean {
  const { serviceId, templateId, publicKey } = emailJsCredentials();
  return Boolean(serviceId && templateId && publicKey);
}

export async function sendViaEmailJs(params: EmailJsTemplateParams): Promise<EmailJsSendResult> {
  const { serviceId, templateId, publicKey } = emailJsCredentials();
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
      const body = await res.text().catch(() => "");
      const snippet = body
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        .replace(/[A-Za-z0-9_-]{20,}/g, "[token]")
        .slice(0, 160);
      console.error("[emailjs] rejected", { status: res.status, snippet: snippet || "empty" });
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
