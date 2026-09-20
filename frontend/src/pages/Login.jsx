import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";

/**
 * LoginPage Component for React + Vite
 * Features min 8 chars password security enforcement, required field asterisks (*),
 * and show/hide password visibility toggle.
 */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // State variables for form input
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Error state
  const [busy, setBusy] = useState(false);
  const [clientError, setClientError] = useState("");
  const [apiError, setApiError] = useState(null);

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError("");
    setApiError(null);

    // Security Check: Password length validation
    if (password.length < 8) {
      setClientError("Password must be at least 8 characters long.");
      return;
    }

    setBusy(true);
    try {
      const userData = await login(email, password);
      const nextType = userData?.profile?.user_type ?? userData?.user_type ?? "Customer";
      navigate(nextType === "Vendor" ? "/vendor/dashboard" : "/");
    } catch (err) {
      setApiError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gn-container py-16">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <p className="gn-eyebrow text-primary">Welcome Back</p>
          <h1 className="mt-2 text-4xl font-display text-foreground">Log In to Glow Next</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Access your appointments and account settings.
          </p>
        </div>

        <form className="gn-card mt-8 space-y-5 p-8 border border-border" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div>
            <label className="gn-label flex items-center justify-between" htmlFor="email">
              <span>
                Email Address <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="gn-input mt-1.5 w-full"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="gn-label flex items-center justify-between" htmlFor="password">
              <span>
                Password <span className="text-red-500">*</span>
              </span>
              <span className="text-xs text-muted-foreground">(Min. 8 characters)</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="gn-input w-full pr-10"
              />
              {/* Show/Hide Password Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                title={showPassword ? "Hide password" : "Show password"}
              >
                <i className={showPassword ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
              </button>
            </div>
          </div>

          {/* Inline Validation Errors */}
          {clientError ? (
            <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200">
              <i className="fa-solid fa-triangle-exclamation mr-1.5" />
              {clientError}
            </div>
          ) : null}

          {apiError ? <ErrorMessage error={apiError} /> : null}

          {/* Submit Button */}
          <button
            type="submit"
            className="gn-btn gn-btn-primary w-full py-3 text-base font-bold"
            disabled={busy}
          >
            {busy ? "Logging in..." : "Log In"}
          </button>

          {/* Bottom Links */}
          <div className="flex justify-end pt-2 text-sm">
            <Link to="/register" className="font-semibold text-foreground hover:underline">
              Create an Account &rarr;
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
