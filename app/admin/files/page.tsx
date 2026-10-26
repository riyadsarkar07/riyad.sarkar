"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, ImageIcon } from "lucide-react";
import { useSupabase } from "@/hooks/use-supabase";
import { PageHeader } from "@/components/portal/page-header";
import { LoadError } from "@/components/portal/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast";
import type { AppointmentFile, SupportFile } from "@/types/dashboard";

type Row = {
  id: string;
  kind: "appointment" | "support";
  bucket: "appointment-files" | "support-files";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  user_id: string | null;
  created_at: string;
  reference_id?: string | null;
};

export default function AdminFilesPage() {
  const supabase = useSupabase();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [a, s, aAppts, sTickets] = await Promise.all([
      supabase.from("appointment_files").select("*").order("created_at", { ascending: false }),
      supabase.from("support_files").select("*").order("created_at", { ascending: false }),
      supabase.from("appointments").select("id, reference_id"),
      supabase.from("support_tickets").select("id, reference_id"),
    ]);
    const failed = [a, s, aAppts, sTickets].find((r) => r.error);
    if (failed?.error) {
      setLoadError(failed.error.message || "Could not load files.");
      setRows([]);
      setLoading(false);
      return;
    }
    const apptRef: Record<string, string | null> = {};
    for (const row of aAppts.data ?? []) apptRef[row.id] = row.reference_id;
    const ticketRef: Record<string, string | null> = {};
    for (const row of sTickets.data ?? []) ticketRef[row.id] = row.reference_id;

    const aRows: Row[] = ((a.data ?? []) as AppointmentFile[]).map((f) => ({
      id: f.id,
      kind: "appointment",
      bucket: "appointment-files",
      storage_path: f.storage_path,
      file_name: f.file_name,
      mime_type: f.mime_type,
      size: f.size,
      user_id: f.user_id,
      created_at: f.created_at,
      reference_id: apptRef[f.appointment_id] ?? null,
    }));
    const sRows: Row[] = ((s.data ?? []) as SupportFile[]).map((f) => ({
      id: f.id,
      kind: "support",
      bucket: "support-files",
      storage_path: f.storage_path,
      file_name: f.file_name,
      mime_type: f.mime_type,
      size: f.size,
      user_id: f.user_id,
      created_at: f.created_at,
      reference_id: ticketRef[f.ticket_id] ?? null,
    }));
    const combined = [...aRows, ...sRows].sort((x, y) => y.created_at.localeCompare(x.created_at));
    setRows(combined);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (row: Row) => {
    const { data } = await supabase.storage.from(row.bucket).createSignedUrl(row.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast("error", "Could not open file");
  };

  const totalSize = rows.reduce((n, r) => n + r.size, 0);

  return (
    <div>
      <PageHeader
        title="Files"
        subtitle="Every attachment uploaded to appointments and support tickets."
      />

      <p className="mb-5 text-xs text-muted-foreground">
        {rows.length} files · {(totalSize / (1024 * 1024)).toFixed(2)} MB total · PNG/JPG/JPEG/PDF only, ≤ 5 MB each
      </p>

      {loadError && <LoadError message={loadError} onRetry={() => load()} />}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : loadError ? null : rows.length === 0 ? (
        <div className="glass gradient-border rounded-2xl px-6 py-16 text-center text-sm text-muted-foreground">
          No files uploaded yet.
        </div>
      ) : (
        <div className="glass gradient-border overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Linked to</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 transition-colors last:border-0 hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-cyan-500">
                        {r.mime_type.startsWith("image/") ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </span>
                      <span className="max-w-[260px] truncate font-medium">{r.file_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.mime_type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${
                        r.kind === "appointment"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      {r.kind === "appointment" ? "Appointment" : "Support"}
                      {r.reference_id ? ` · ${r.reference_id}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{(r.size / 1024).toFixed(1)} KB</td>
                  <td className="px-4 py-3 text-xs">
                    {new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => download(r)} className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
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
