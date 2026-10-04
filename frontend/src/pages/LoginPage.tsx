
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL, readErrorMessage } from "../utils/api";
import type { LoginResponse } from "../types";

/* Optional contact line under the form. Set VITE_CONTACT_PHONE (e.g. in the Vercel
   dashboard) to show it; when it is not set the line is hidden, so no phone number
   has to live in the code or in git. */
const CONTACT_PHONE: string | undefined = import.meta.env.VITE_CONTACT_PHONE || undefined;

/* wa.me links want international digits only: an Israeli 05X number becomes 9725X... */
function whatsappDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? "972" + digits.slice(1) : digits;
}

/* The login screen - one form for both roles, redirects to the right
   dashboard based on the role the backend returns */
function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* true only when the backend has demo mode switched on - decides if the "Try demo" button shows */
  const [demoEnabled, setDemoEnabled] = useState(false);

  /* asks the backend once on load; any failure just means no demo button */
  useEffect(() => {
    fetch(`${API_BASE_URL}/auth/demo/status`)
      .then((response) => (response.ok ? response.json() : { enabled: false }))
      .then((data) => setDemoEnabled(data.enabled === true))
      .catch(() => setDemoEnabled(false));
  }, []);

  /* Stores the token and redirects based on role - shared by the normal login and the demo button */
  function finishLogin(data: LoginResponse) {
    localStorage.setItem("token", data.token);
    if (data.role === "TEACHER") {
        navigate("/teacher");
    } else if (data.role === "STUDENT") {
        navigate("/student");
    }
  }

  /* Logs in with the typed email and password */
  async function handleLogin() {
    setErrorMessage("");
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response, "Failed to log in"));
      return;
    }

    finishLogin(await response.json());
  }

  /* "Try demo": signs in as the teacher with no password (only works while demo mode is on) */
  async function handleDemoLogin() {
    setErrorMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/auth/demo/teacher`, { method: "POST" });
      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "The demo is not available right now"));
        return;
      }
      finishLogin(await response.json());
    } catch {
      setErrorMessage("Could not reach the server. It may be waking up - try again in a minute.");
    }
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* branding panel, hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 text-white flex-col justify-between p-12">
        <div className="text-xl font-semibold tracking-tight">TutorHub</div>

        <div>
          <h2 className="text-3xl font-semibold leading-snug mb-3">
            Your lessons, materials, and payments — all in one place.
          </h2>
          <p className="text-indigo-100 text-sm max-w-md">
            Log in to see your upcoming lessons, download materials your tutor shared,
            and keep track of your balance.
          </p>
        </div>

        <div className="text-indigo-200 text-xs">
          &copy; {new Date().getFullYear()} TutorHub
        </div>
      </div>

      {/* the actual login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <h1 className="text-2xl font-semibold text-slate-900">TutorHub</h1>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
              >
                Log in
              </button>
            </form>

            {demoEnabled && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  className="w-full rounded-lg border border-indigo-600 text-indigo-600 text-sm font-medium py-2.5 hover:bg-indigo-50 transition-colors"
                >
                  Try demo
                </button>
                <p className="text-xs text-slate-500 text-center mt-2">
                  Explore the teacher dashboard with sample data - no account needed.
                </p>
              </div>
            )}
          </div>

          {CONTACT_PHONE && (
            <p className="text-sm text-slate-500 text-center mt-4">
              Need help? Contact me: {CONTACT_PHONE}{" "}
              (
              <a
                href={`https://wa.me/${whatsappDigits(CONTACT_PHONE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                WhatsApp
              </a>
              )
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;