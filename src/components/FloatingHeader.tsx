"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/cn";

const nav = [
  { href: "/values", label: "Values" },
  { href: "/calculator", label: "Calculator" },
  ...(process.env.NODE_ENV === "development" ? [{ href: "/admin", label: "Admin" }] : []),
  ...(process.env.NODE_ENV === "development" ? [{ href: "/updates", label: "Updates" }] : []),
];

export function FloatingHeader() {
  const pathname = usePathname();
  const homeActive = pathname === "/";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { scrollY } = useScroll();
  const y = useSpring(useTransform(scrollY, [0, 180], [0, -5]), { stiffness: 420, damping: 42 });
  const opacity = useSpring(useTransform(scrollY, [0, 180], [1, 0.95]), { stiffness: 420, damping: 42 });

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-4 z-50 flex justify-center px-3"
        style={{ y, opacity }}
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <nav className="site-header-shell relative flex h-[3.9rem] w-full max-w-[860px] items-center justify-center px-3 py-2">
          <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(var(--bright-gold)/.34)] to-transparent" />

          <Link
            href="/"
            className={cn("mobile-menu-logo site-brand group", homeActive && "site-brand-active")}
            aria-label="AOTR Value Central home"
          >
            <span className="site-brand-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aotevo-logo.png" alt="" draggable={false} />
            </span>
          </Link>

          <Link href="/" className={cn("site-brand desktop-site-brand group absolute left-3 top-1/2 grid h-9 w-[4.8rem] -translate-y-1/2 place-items-center rounded-lg transition", homeActive && "site-brand-active")} aria-label="AOTR Value Central home">
            <span className="site-brand-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aotevo-logo.png" alt="" draggable={false} />
            </span>
          </Link>

          <div className={cn("desktop-nav-grid grid w-full min-w-0 gap-1.5", nav.length === 4 ? "max-w-[560px] grid-cols-4" : nav.length === 3 ? "max-w-[440px] grid-cols-3" : "max-w-[300px] grid-cols-2")}>
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

          <button
            type="button"
            className="mobile-menu-icon"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-site-nav"
          >
            <Menu size={18} strokeWidth={2.4} />
          </button>
        </nav>
      </motion.header>

      <div
        className={cn("mobile-sidebar-backdrop", mobileNavOpen && "mobile-sidebar-backdrop-open")}
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside
        id="mobile-site-nav"
        className={cn("mobile-sidebar", mobileNavOpen && "mobile-sidebar-open")}
        aria-hidden={!mobileNavOpen}
      >
        <div className="mobile-sidebar-head">
          <Link href="/" onClick={() => setMobileNavOpen(false)} className={cn("mobile-menu-logo site-brand mobile-sidebar-logo group", homeActive && "site-brand-active")} aria-label="AOTR Value Central home">
            <span className="site-brand-mark" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/aotevo-logo.png" alt="" draggable={false} />
            </span>
          </Link>
          <button type="button" className="mobile-sidebar-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        <nav className="mobile-sidebar-links" aria-label="Mobile navigation">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn("mobile-sidebar-link", active && "mobile-sidebar-link-active")}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
