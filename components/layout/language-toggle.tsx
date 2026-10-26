"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** English / বাংলা language toggle. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-10 w-10 sm:h-11 sm:w-11", className)} aria-label="Change language">
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLang("en")}
          className={lang === "en" ? "bg-primary/10 text-primary" : undefined}
        >
          <span className="mr-2 text-xs">🇬🇧</span> English
          {lang === "en" && <span className="ml-auto text-primary">●</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLang("bn")}
          className={lang === "bn" ? "bg-primary/10 text-primary" : undefined}
        >
          <span className="mr-2 text-xs">🇧🇩</span> বাংলা
          {lang === "bn" && <span className="ml-auto text-primary">●</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
