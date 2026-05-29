"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/cn";

const nav = [
  { href: "/values", label: "Values" },
  { href: "/calculator", label: "Calculator" },
  ...(process.env.NODE_ENV === "development" ? [{ href: "/updates", label: "Updates" }] : []),
];

export function FloatingHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 180], [0, -5]), { stiffness: 420, damping: 42 });
  const opacity = useSpring(useTransform(scrollY, [0, 180], [1, 0.95]), { stiffness: 420, damping: 42 });

  return (
    <motion.header
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-3"
      style={{ y, opacity }}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      <nav className="site-header-shell relative flex h-[3.9rem] w-full max-w-[860px] items-center justify-center px-3 py-2">
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--bright-gold)/.34)] to-transparent" />

        <Link href="/" className="site-brand group absolute left-3 top-1/2 grid h-9 w-[4.8rem] -translate-y-1/2 place-items-center rounded-lg transition" aria-label="AOTR Value Central home">
          <span className="site-brand-mark" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aotevo-logo.png" alt="" draggable={false} />
          </span>
        </Link>

        <div className={cn("grid w-full min-w-0 gap-1.5", nav.length === 3 ? "max-w-[440px] grid-cols-3" : "max-w-[300px] grid-cols-2")}>
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "site-nav-link",
                  active && "site-nav-link-active",
                )}
              >
                <span className="truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </motion.header>
  );
}
