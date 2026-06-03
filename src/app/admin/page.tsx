import { AdminPanel } from "@/components/AdminPanel";
import { DiscordIcon } from "@/components/icons/DiscordIcon";
import { getDiscordSession } from "@/lib/discordAuth";
import { getPublicValueMarketData } from "@/lib/supabaseItems";

export const dynamic = "force-dynamic";

function getAuthMessage(auth?: string, message?: string) {
  if (auth === "failed") return "Discord login failed. Please try again.";
  if (auth === "invalid") return "Discord login expired. Please start again.";
  if (auth === "setup") return message || "Discord login is not configured yet.";

  return "Sign in with Discord to continue. Admin tools unlock only for whitelisted Discord IDs.";
}

function AdminAccessScreen({ auth, message, signedIn }: { auth?: string; message?: string; signedIn?: string }) {
  return (
    <section className="admin-shell px-4 pb-7 pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <div className="admin-auth-panel">
          <span>Discord authorization</span>
          <h1 className="font-display">Admin Access</h1>
          <p>{signedIn ? `${signedIn} is logged in, but this Discord account is not on the admin whitelist.` : getAuthMessage(auth, message)}</p>
          <div className="admin-auth-actions">
            <a className="site-auth-button" href="/api/auth/discord/login?next=/admin">
              <DiscordIcon className="site-auth-discord-icon" />
              <span>Login</span>
            </a>
            {signedIn ? (
              <form action="/api/auth/discord/logout" method="post">
                <button type="submit" className="admin-secondary-action">
                  Logout
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ auth?: string; message?: string }> }) {
  const [{ auth, message }, session] = await Promise.all([searchParams, getDiscordSession()]);

  if (!session?.isAdmin) {
    return (
      <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
        <AdminAccessScreen auth={auth} message={message} signedIn={session?.username} />
      </main>
    );
  }

  const { currencySettings, items } = await getPublicValueMarketData();

  return (
    <main id="main-content" className="aurora-page grain min-h-screen overflow-hidden">
      <AdminPanel adminRole={session.adminRole} initialItems={items} initialCurrencySettings={currencySettings} />
    </main>
  );
}
