
import { useNavigate } from "react-router-dom";
import { useState } from "react";
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

  /* Stores the token and redirects based on role - used after a successful login */
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

  return (
    <div className="font-login min-h-screen w-full flex bg-[#F5F6FA]">
      {/* branding panel with a decorative weekly timetable, hidden on small screens */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#1B2A5C] text-[#F5F6FA] flex-col justify-between p-12 xl:p-16">
        <div className="font-display flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <span className="inline-block h-5 w-5 rounded-[5px] bg-[#FFD84D]" aria-hidden="true" />
          TutorHub
        </div>

        <div>
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-[1.08] tracking-tight max-w-md">
            Your lessons, materials, and payments in one place.
          </h2>
          <p className="mt-4 text-[#C5CBE6] text-base max-w-sm leading-relaxed">
            See what is coming up this week, open the materials your tutor shared,
            and check your balance.
          </p>

          {/* decorative week: Sun-Thu, four evening slots */}
          <div className="mt-10 max-w-md" aria-hidden="true">
            <div className="grid grid-cols-5 gap-2 text-xs text-[#9AA5D1] mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-5 grid-rows-4 gap-2 h-44">
              <div style={{ "--i": 0, gridColumn: 1, gridRow: "1 / span 2" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#FFD84D]" />
              <div style={{ "--i": 1, gridColumn: 2, gridRow: "3 / span 2" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#8FE0C5]" />
              <div style={{ "--i": 2, gridColumn: 3, gridRow: "2 / span 1" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#B9B4F5]" />
              <div style={{ "--i": 3, gridColumn: 4, gridRow: "1 / span 2" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#FFD84D]" />
              <div style={{ "--i": 4, gridColumn: 4, gridRow: "4 / span 1" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#8FE0C5]" />
              <div style={{ "--i": 5, gridColumn: 5, gridRow: "3 / span 2" } as React.CSSProperties}
                   className="login-block rounded-md bg-[#B9B4F5]" />
              <div className="col-span-5 row-span-4 col-start-1 row-start-1 -z-0 pointer-events-none rounded-md border border-white/10" />
            </div>
          </div>
        </div>

        <div className="text-[#9AA5D1] text-xs">
          &copy; {new Date().getFullYear()} TutorHub
        </div>
      </div>

      {/* the actual login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="font-display lg:hidden mb-10 flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#1B2A5C]">
            <span className="inline-block h-5 w-5 rounded-[5px] bg-[#FFD84D]" aria-hidden="true" />
            TutorHub
          </div>

          <h1 className="font-display text-3xl font-bold tracking-tight text-[#1B2A5C]">Welcome back</h1>
          <p className="text-base text-[#5B6384] mt-2">Log in with the email and password you were given.</p>

          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-[#1B2A5C]">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#C3C9E0] bg-white px-3.5 py-3 text-base text-[#1B2A5C] focus:outline-none focus:border-[#1B2A5C] focus:ring-4 focus:ring-[#FFD84D]/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-[#1B2A5C]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#C3C9E0] bg-white px-3.5 py-3 pr-16 text-base text-[#1B2A5C] focus:outline-none focus:border-[#1B2A5C] focus:ring-4 focus:ring-[#FFD84D]/60"
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3.5 text-sm font-semibold text-[#3B4A8C] hover:text-[#1B2A5C] rounded-r-lg focus-visible:outline-2 focus-visible:outline-[#1B2A5C]"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-lg bg-[#FDECE8] border border-[#F2B8AB] px-3.5 py-2.5 text-sm text-[#9C2B16]">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-[#1B2A5C] text-white text-base font-semibold py-3 hover:bg-[#13204A] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D]/70"
            >
              Log in
            </button>
          </form>

          {CONTACT_PHONE && (
            <p className="text-sm text-[#5B6384] mt-8">
              Can't log in? Message me: {CONTACT_PHONE}{" "}
              (
              <a
                href={`https://wa.me/${whatsappDigits(CONTACT_PHONE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1B2A5C] underline underline-offset-2 font-semibold"
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