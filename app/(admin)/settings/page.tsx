export default function SettingsPage() {
  return (
    <main className="container">
      <h1>Settings</h1>
      <p className="lead">
        Environment and account setup checks will live here as this build progresses.
      </p>
      <div className="card">
        <h2>Required env vars</h2>
        <p>
          POSTGRES_PRISMA_URL, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_REDIRECT_URI, REDDIT_USER_AGENT, OPENAI_API_KEY, ADMIN_PASSWORD, TOKEN_ENCRYPTION_KEY, CRON_TOKEN.
        </p>
      </div>
    </main>
  );
}
