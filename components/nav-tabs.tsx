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
    <nav className="flex gap-1 -mb-px">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
