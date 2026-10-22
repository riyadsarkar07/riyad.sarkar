type StorageKind = "booking" | "ticket";

const INBOX = "riyadsarkar1243@gmail.com";

export function unconfiguredStorageMessage(kind: StorageKind): string {
  return kind === "booking"
    ? `Booking storage is not configured in this environment. Please email me directly at ${INBOX}.`
    : `Ticket storage is not configured in this environment. Please email me directly at ${INBOX}.`;
}

export function persistFailureMessage(
  kind: StorageKind,
  error?: { code?: string; message?: string; hint?: string } | null,
): string {
  const code = error?.code ?? "";
  const message = (error?.message ?? "").toLowerCase();

  if (code === "23505") {
    return kind === "booking"
      ? "You already have an appointment for this date and time."
      : "This enquiry was already submitted. Please wait a moment before sending another.";
  }

  if (
    code === "57014" ||
    code === "PGRST301" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("abort")
  ) {
    return kind === "booking"
      ? "The appointment request timed out. Please try again."
      : "The enquiry request timed out. Please try again.";
  }

  if (code === "PGRST202" || code === "42883" || message.includes("could not find the function")) {
    return kind === "booking"
      ? `Booking storage is not available on the server yet. Please email me directly at ${INBOX}.`
      : `Ticket storage is not available on the server yet. Please email me directly at ${INBOX}.`;
  }

  if (code === "42501" || message.includes("permission") || message.includes("rls")) {
    return kind === "booking"
      ? "The appointment could not be saved because storage access was denied. Please try again or email me directly."
      : "The enquiry could not be saved because storage access was denied. Please try again or email me directly.";
  }

  return kind === "booking"
    ? "The appointment could not be saved. Please try again or email me directly."
    : "The enquiry could not be saved. Please try again or email me directly.";
}

export function logPersistFailure(
  label: "consultation" | "enquiry" | "ticket-lookup" | "ticket-reply",
  error?: { code?: string; message?: string; hint?: string } | null,
) {
  console.error(`[${label}] persist failed`, {
    code: error?.code ?? "unknown",
    hint: error?.hint ?? null,
    message: error?.message ? "present" : "none",
  });
}
