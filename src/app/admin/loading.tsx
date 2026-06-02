export default function AdminLoading() {
  return (
    <main className="aurora-page grain min-h-screen overflow-hidden">
      <section className="admin-shell px-4 pb-7 pt-28 sm:px-6 lg:px-8" aria-live="polite" aria-busy="true">
        <div className="mx-auto grid max-w-6xl gap-4">
          <div className="admin-loading-panel">
            <div>
              <span>Admin console</span>
              <h1 className="font-display">Opening Admin</h1>
              <p>Checking access and preparing the editor.</p>
            </div>
            <div className="admin-loading-mark" aria-hidden="true">
              <span />
            </div>
          </div>

          <div className="admin-loading-tabs" aria-hidden="true">
            {["Items", "Conversion", "Stats", "Logs", "Controls"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="admin-loading-grid" aria-hidden="true">
            <div className="admin-loading-list">
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="admin-loading-editor">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
