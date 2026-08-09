import { redirect } from "next/navigation";

export default async function SupportTicketRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Support conversation is rendered in the messenger inbox keyed by ticket id.
  const { id } = await params;
  redirect(`/dashboard/support?ticket=${id}`);
}
