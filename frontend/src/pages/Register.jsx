import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ErrorMessage } from "@/components/ErrorMessage";

/**
 * RegisterPage Component for React + Vite
 * Features required asterisks (*), 8+ char password security checks, and password match validation.
 */
export default function Register() {
  const { register } = useAuth();

  // Form State
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
    password2: "",
    user_type: "Customer", // 'Customer' or 'Vendor'
  });

  // UI state for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  // Status & Error States
  const [busy, setBusy] = useState(false);
  const [clientError, setClientError] = useState("");
  const [apiError, setApiError] = useState(null);
  const [done, setDone] = useState(false);

  // Helper function to update form state
  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setClientError("");
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setClientError("");
    setApiError(null);

    // 1. Required field checks
    if (!form.full_name.trim() || !form.username.trim() || !form.email.trim() || !form.mobile.trim()) {
      setClientError("Please fill out all required fields marked with *.");
      return;
    }

    // 2. Password Length Check (Must be at least 8 characters)
    if (form.password.length < 8) {
      setClientError("Security requirement: Password must be at least 8 characters long.");
      return;
    }

    // 3. Password Confirmation Check
    if (form.password !== form.password2) {
      setClientError("Passwords do not match. Please check and try again.");
      return;
    }

    setBusy(true);
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setApiError(err);
    } finally {
      setBusy(false);
    }
  };

  const isMinLength = form.password.length >= 8;
  const isMatch = form.password.length > 0 && form.password === form.password2;

  return (
    <div className="gn-container py-16">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <p className="gn-eyebrow text-primary">Join Glow Next</p>
          <h1 className="mt-2 text-4xl font-display text-foreground">Create Your Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up as a client to book appointments, or as a salon partner to list services.
          </p>
        </div>

        {done ? (
          <div className="gn-card mt-8 p-10 text-center border border-border">
            <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">
              <i className="fa-solid fa-check" />
            </div>
            <h2 className="font-display text-3xl text-foreground">Account Created Successfully!</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              Welcome to Glow Next! You can log in right now. Salon partner accounts will be verified by our team within 24 hours.
            </p>
            <Link to="/login" className="gn-btn gn-btn-primary mt-6 inline-block px-8 py-3 text-base">
              Go to Log In
            </Link>
          </div>
        ) : (
          <form className="gn-card mt-8 space-y-5 p-8 border border-border" onSubmit={handleSubmit}>
            {/* Account Type Selection */}
            <div>
              <label className="gn-label block font-semibold mb-2">
                I want to join as: <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateField("user_type", "Customer")}
                  className={`gn-btn py-3 text-sm font-bold border transition-all ${
                    form.user_type === "Customer"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  <i className="fa-solid fa-user mr-2" /> Client (Book Services)
                </button>
                <button
                  type="button"
                  onClick={() => updateField("user_type", "Vendor")}
                  className={`gn-btn py-3 text-sm font-bold border transition-all ${
                    form.user_type === "Vendor"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/40 text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  <i className="fa-solid fa-store mr-2" /> Salon / Artist
                </button>
              </div>
            </div>

            {/* Full Name & Username */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="gn-label" htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="full_name"
                  required
                  placeholder="e.g. Ananya Sharma"
                  value={form.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  className="gn-input mt-1.5 w-full"
                />
              </div>
              <div>
                <label className="gn-label" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  placeholder="ananya_s"
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  className="gn-input mt-1.5 w-full"
                />
              </div>
            </div>

            {/* Email & Mobile */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="gn-label" htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="ananya@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="gn-input mt-1.5 w-full"
                />
              </div>
              <div>
                <label className="gn-label" htmlFor="mobile">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="mobile"
                  type="tel"
                  required
                  placeholder="9800000000"
                  value={form.mobile}
                  onChange={(e) => updateField("mobile", e.target.value)}
                  className="gn-input mt-1.5 w-full"
                />
              </div>
            </div>

            {/* Passwords Section */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Password */}
              <div>
                <label className="gn-label" htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="gn-input w-full pr-10"
                  />
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

              {/* Confirm Password */}
              <div>
                <label className="gn-label" htmlFor="password2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password2"
                    type={showPassword2 ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    value={form.password2}
                    onChange={(e) => updateField("password2", e.target.value)}
                    className="gn-input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword2((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-sm"
                    title={showPassword2 ? "Hide password" : "Show password"}
                  >
                    <i className={showPassword2 ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                  </button>
                </div>
              </div>
            </div>

            {/* Password Security Checklist */}
            <div className="p-3.5 bg-secondary/30 rounded-xl border border-border text-xs space-y-1.5">
              <p className="font-bold text-foreground">Password Security Requirements:</p>
              <div className="flex items-center gap-2">
                <i
                  className={`fa-solid ${
                    isMinLength ? "fa-circle-check text-emerald-500" : "fa-circle-xmark text-muted-foreground"
                  }`}
                />
                <span className={isMinLength ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  At least 8 characters long
                </span>
              </div>
              <div className="flex items-center gap-2">
                <i
                  className={`fa-solid ${
                    isMatch ? "fa-circle-check text-emerald-500" : "fa-circle-xmark text-muted-foreground"
                  }`}
                />
                <span className={isMatch ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                  Passwords match
                </span>
              </div>
            </div>

            {/* Validation Error Banners */}
            {clientError ? (
              <div className="p-3.5 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200">
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
              {busy ? "Creating Account..." : "Create Account"}
            </button>

            {/* Already registered */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Log In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
