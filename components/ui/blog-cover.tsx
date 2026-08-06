import { Lock, MessageCircle, ShieldCheck, UserX, Globe, KeyRound } from "lucide-react";

const coverMap: Record<string, { icon: typeof Lock; gradient: string }> = {
  "facebook-recovery": {
    icon: MessageCircle,
    gradient: "from-blue-600/40 via-sky-500/30 to-cyan-400/20",
  },
  "phishing-defense": {
    icon: ShieldCheck,
    gradient: "from-cyan-500/40 via-sky-500/25 to-blue-600/20",
  },
  "instagram-recovery": {
    icon: UserX,
    gradient: "from-fuchsia-500/35 via-pink-500/25 to-rose-500/20",
  },
  "identity-security": {
    icon: KeyRound,
    gradient: "from-indigo-500/40 via-blue-500/25 to-sky-500/20",
  },
  "dmca-guide": {
    icon: Globe,
    gradient: "from-violet-500/35 via-purple-500/25 to-indigo-500/20",
  },
  "2fa-guide": {
    icon: Lock,
    gradient: "from-emerald-500/35 via-teal-500/25 to-cyan-500/20",
  },
};

/** Generated SVG-style cover art for blog posts (no photos). */
export function BlogCover({
  cover,
  className,
}: {
  cover: string;
  className?: string;
}) {
  const meta = coverMap[cover] ?? coverMap["2fa-guide"];
  const Icon = meta.icon;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${meta.gradient} ${className ?? ""}`}>
      <div className="bg-grid absolute inset-0 opacity-40" />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex h-full w-full items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-white shadow-lg backdrop-blur-md">
          <Icon className="h-8 w-8" />
        </div>
      </div>
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20" />
    </div>
  );
}
