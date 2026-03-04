export default function LoginPage() {
  return (
    <main className="container">
      <h1>Admin Login</h1>
      <p className="lead">Enter the shared admin password to access internal pages.</p>

      <form className="card loginForm" method="POST" action="/api/admin/login">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
