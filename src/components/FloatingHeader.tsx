"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Calculator, Gem, Hammer, Handshake, ListChecks, LogOut, Menu, Newspaper, PackageSearch, Settings2, ShieldCheck, SlidersHorizontal, X } from "lucide-react";

import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { cn } from "@/lib/cn";

const publicNav = [
  { href: "/values", label: "Values", icon: Gem },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  ...(process.env.NODE_ENV === "development"
    ? [
        { href: "/trades", label: "Trades", icon: Handshake },
        { href: "/updates", label: "Updates", icon: Newspaper },
      ]
    : []),
];
const adminSections = [
  { href: "/admin?tab=items", id: "items", label: "Items", icon: PackageSearch },
  { href: "/admin?tab=rates", id: "rates", label: "Conversion", icon: SlidersHorizontal },
  { href: "/admin?tab=stats", id: "stats", label: "Stats", icon: BarChart3 },
  { href: "/admin?tab=logs", id: "logs", label: "Logs", icon: ListChecks },
  { href: "/admin?tab=controls", id: "controls", label: "Controls", icon: Settings2 },
];
const scrollDownIntentThreshold = 2;
let adminWarmupPromise: Promise<unknown> | null = null;
let routePrefetchScheduled = false;

function runAfterLoad(callback: () => void, delay: number) {
  if (typeof window === "undefined") return;

  const schedule = () => window.setTimeout(callback, delay);

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }
}

type HeaderSession = {
  avatar: string | null;
  id: string;
  isAdmin: boolean;
  username: string;
};

export function FloatingHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const homeActive = pathname === "/";
  const [activeAdminTab, setActiveAdminTab] = useState("items");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [desktopAdminOpen, setDesktopAdminOpen] = useState(false);
  const [desktopAdminSuppressed, setDesktopAdminSuppressed] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [session, setSession] = useState<HeaderSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const latest = window.scrollY;
      const delta = latest - lastScrollY.current;
      lastScrollY.current = latest;

      if (mobileNavOpen || latest <= 0) {
        setHeaderHidden(false);
        return;
      }

      if (delta > scrollDownIntentThreshold) {
        setHeaderHidden(true);
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileNavOpen]);

  useEffect(() => {
    lastScrollY.current = 0;
    setHeaderHidden(false);
  }, [pathname]);

  useEffect(() => {
    const updateActiveAdminTab = () => {
      const tab = new URLSearchParams(window.location.search).get("tab");
      setActiveAdminTab(tab || "items");
    };

    updateActiveAdminTab();
    window.addEventListener("popstate", updateActiveAdminTab);

    return () => window.removeEventListener("popstate", updateActiveAdminTab);
  }, [pathname]);

  function selectAdminTab(tab: string) {
    setActiveAdminTab(tab);
    setDesktopAdminOpen(false);
    setDesktopAdminSuppressed(true);
    window.dispatchEvent(new CustomEvent("admin-tab-change", { detail: tab }));
  }

  function openDesktopAdminMenu() {
    if (!desktopAdminSuppressed) {
      setDesktopAdminOpen(true);
    }
  }

  function resetDesktopAdminMenu() {
    setDesktopAdminOpen(false);
    setDesktopAdminSuppressed(false);
  }

  const warmAdminRoute = useCallback(() => {
    if (!session?.isAdmin) return;

    router.prefetch("/admin?tab=items");

    adminWarmupPromise ??= Promise.allSettled([
      import("@/components/AdminPanel"),
      fetch("/admin?tab=items", {
        cache: "no-store",
        credentials: "include",
      }).then((response) => response.text()),
    ]);
  }, [router, session?.isAdmin]);

  const prefetchCoreRoutes = useCallback(() => {
    if (routePrefetchScheduled) return;

    routePrefetchScheduled = true;
    ["/", ...publicNav.map((item) => item.href)].forEach((href) => {
      if (href !== pathname) {
        router.prefetch(href);
      }
    });
  }, [pathname, router]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    setHeaderHidden(false);

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

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await response.json()) as { session: HeaderSession | null };

        if (!cancelled) {
          setSession(data.session);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setSessionLoaded(true);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;

    runAfterLoad(prefetchCoreRoutes, 1400);

    if (session?.isAdmin) {
      runAfterLoad(warmAdminRoute, 9000);
    }
  }, [prefetchCoreRoutes, session?.isAdmin, sessionLoaded, warmAdminRoute]);

  const loginHref = `/api/auth/discord/login?next=${encodeURIComponent(pathname || "/")}`;
  const nav = sessionLoaded && session?.isAdmin ? [...publicNav.slice(0, 3), { href: "/admin", label: "Admin", icon: Hammer }, ...publicNav.slice(3)] : publicNav;

  return (
    <>
      <header
        className="fixed inset-x-0 top-4 z-50 flex justify-center px-3"
        style={{
          opacity: headerHidden ? 0 : 1,
          pointerEvents: headerHidden ? "none" : "auto",
          transition: "opacity 240ms ease",
        }}
      >
        <nav className="site-header-shell relative flex h-[3.9rem] w-full max-w-[1060px] items-center justify-center px-3 py-2">
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

          <div
            className={cn(
              "desktop-nav-grid grid w-full min-w-0 gap-1.5",
              nav.length === 5
                ? "max-w-[680px] grid-cols-5"
                : nav.length === 4
                  ? "max-w-[560px] grid-cols-4"
                  : nav.length === 3
                    ? "max-w-[440px] grid-cols-3"
                    : "max-w-[300px] grid-cols-2",
            )}
          >
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              if (item.href === "/admin") {
                return (
                  <div key={item.href} className={cn("site-admin-nav", desktopAdminOpen && "site-admin-nav-open")} onMouseEnter={openDesktopAdminMenu} onMouseLeave={resetDesktopAdminMenu}>
                    <Link
                      href="/admin?tab=items"
                      onClick={(event) => {
                        selectAdminTab("items");
                        event.currentTarget.blur();
                      }}
                      onFocus={() => {
                        openDesktopAdminMenu();
                        warmAdminRoute();
                      }}
                      onPointerEnter={warmAdminRoute}
                      className={cn("site-nav-link site-admin-trigger", active && "site-nav-link-active")}
                      aria-expanded={desktopAdminOpen}
                    >
                      <Icon className="site-nav-icon" size={14} strokeWidth={2.5} aria-hidden="true" />
                      <span className="truncate text-center">{item.label}</span>
                    </Link>
                    <div className="site-admin-menu" aria-label="Admin sections">
                      {adminSections.map((section) => {
                        const SectionIcon = section.icon;

                        return (
                          <Link
                            key={section.id}
                            href={section.href}
                            onClick={(event) => {
                              selectAdminTab(section.id);
                              event.currentTarget.blur();
                            }}
                            onFocus={warmAdminRoute}
                            onPointerEnter={warmAdminRoute}
                            className={cn("site-admin-menu-link", active && activeAdminTab === section.id && "site-admin-menu-link-active")}
                          >
                            <SectionIcon size={14} strokeWidth={2.4} aria-hidden="true" />
                            <span>{section.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "site-nav-link",
                    active && "site-nav-link-active",
                  )}
                >
                  <Icon className="site-nav-icon" size={14} strokeWidth={2.5} aria-hidden="true" />
                  <span className="truncate text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="desktop-auth-slot absolute right-3 top-1/2 -translate-y-1/2 items-center">
            {sessionLoaded ? <HeaderAuthControl loginHref={loginHref} session={session} /> : null}
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
      </header>

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
            const Icon = item.icon;
            if (item.href === "/admin") {
              return (
                <div key={item.href} className="mobile-admin-nav">
                  <Link
                    href="/admin?tab=items"
                    onClick={() => {
                      selectAdminTab("items");
                      setMobileNavOpen(false);
                    }}
                    className={cn("mobile-sidebar-link", active && "mobile-sidebar-link-active")}
                  >
                    <Icon className="mobile-sidebar-link-icon" size={17} strokeWidth={2.4} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    className={cn("mobile-admin-toggle", mobileAdminOpen && "mobile-admin-toggle-open")}
                    onClick={() => setMobileAdminOpen((open) => !open)}
                    aria-label="Toggle admin sections"
                    aria-expanded={mobileAdminOpen}
                  >
                    <span />
                  </button>
                  {mobileAdminOpen ? (
                    <div className="mobile-admin-subnav" aria-label="Admin sections">
                      {adminSections.map((section) => {
                        const SectionIcon = section.icon;

                        return (
                          <Link
                            key={section.id}
                            href={section.href}
                            onClick={() => {
                              selectAdminTab(section.id);
                              setMobileNavOpen(false);
                            }}
                            className={cn("mobile-admin-subnav-link", active && activeAdminTab === section.id && "mobile-admin-subnav-link-active")}
                          >
                            <SectionIcon size={15} strokeWidth={2.4} aria-hidden="true" />
                            <span>{section.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn("mobile-sidebar-link", active && "mobile-sidebar-link-active")}
              >
                <Icon className="mobile-sidebar-link-icon" size={17} strokeWidth={2.4} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mobile-sidebar-auth">
          {sessionLoaded ? <HeaderAuthControl loginHref={loginHref} session={session} /> : null}
        </div>
      </aside>
    </>
  );
}

function HeaderAuthControl({ loginHref, session }: { loginHref: string; session: HeaderSession | null }) {
  if (!session) {
    return (
      <a className="site-auth-button" href={loginHref}>
        <DiscordIcon className="site-auth-discord-icon" />
        <span>Login</span>
      </a>
    );
  }

  return (
    <div className="site-user-menu">
      <span className="site-user-avatar">
        {session.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.avatar} alt="" draggable={false} />
        ) : (
          <ShieldCheck size={15} strokeWidth={2.4} />
        )}
      </span>
      <span className="site-user-name">{session.username}</span>
      <form action="/api/auth/discord/logout" method="post">
        <button type="submit" className="site-auth-icon-button" aria-label="Logout">
          <LogOut size={15} strokeWidth={2.4} />
        </button>
      </form>
    </div>
  );
}
