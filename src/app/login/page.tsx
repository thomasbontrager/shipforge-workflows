"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

type OAuthProvider = {
  id: string;
  name: string;
  type: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, OAuthProvider>>({});

  useEffect(() => {
    void (async () => {
      const available = await getProviders();
      setProviders((available as Record<string, OAuthProvider>) ?? {});
    })();
  }, []);

  const oauthProviders = useMemo(
    () =>
      Object.values(providers).filter(
        (provider) => provider.type === "oauth"
      ),
    [providers]
  );

  async function handleCredentialsLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setSubmitting(false);
      return;
    }

    if (result?.url) {
      globalThis.location.href = result.url;
      return;
    }

    globalThis.location.href = "/";
  }

  return (
    <main className="auth-main">
      <section className="auth-card">
        <h1>Sign in to Shipforge</h1>
        <p className="auth-subtitle">Use your account credentials to continue.</p>

        <form className="auth-form" onSubmit={handleCredentialsLogin}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {oauthProviders.length > 0 && (
          <div className="oauth-section">
            <p>Or continue with</p>
            <div className="oauth-buttons">
              {oauthProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => void signIn(provider.id, { callbackUrl: "/" })}
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
