"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/tabel",        label: "Tabel" },
  { href: "/kaart",        label: "Kaart" },
  { href: "/auditlog",     label: "Audit-log" },
  { href: "/statistieken", label: "Statistieken" },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0 -mb-px">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-5 py-3.5 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-blue text-blue"
                : "border-transparent text-navy/60 hover:text-navy hover:border-gray-light"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
