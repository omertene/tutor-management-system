
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { API_BASE_URL, readErrorMessage } from "../utils/api";
import type { LoginResponse } from "../types";

/* Optional contact block under the form. Set VITE_CONTACT_PHONE (in frontend/.env.local
   for local dev) to show it; when it is not set the block is hidden, so no phone number
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
      if (response.status === 401) {
        setErrorMessage("האימייל או הסיסמה שגויים.");
      } else if (response.status === 429) {
        setErrorMessage("בוצעו יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.");
      } else {
        setErrorMessage(await readErrorMessage(response, "ההתחברות נכשלה. נסו שוב."));
      }
      return;
    }

    finishLogin(await response.json());
  }

  return (
    <div dir="rtl" lang="he" className="font-login min-h-screen w-full flex bg-[#F5F6FA]">
      {/* branding panel with a decorative weekly timetable, hidden on small screens */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#1B2A5C] text-[#F5F6FA] flex-col justify-between p-12 xl:p-16">
        <div className="font-display flex items-center gap-3 text-2xl font-bold tracking-tight">
          <span className="inline-block h-6 w-6 rounded-md bg-[#FFD84D]" aria-hidden="true" />
          TutorHub
        </div>

        <div>
          <h2 className="font-display text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-[1.08] tracking-tight">
            מתי השיעור הבא?
          </h2>
          <p className="mt-5 text-[#D5DAF0] text-lg xl:text-xl max-w-lg leading-relaxed">
            מערכת השעות, החומרים והתשלומים שלך, הכול במקום אחד.
          </p>

          {/* decorative week: Sun-Thu (first column is on the right in RTL), hours on the side.
              Not real data - the outlined block just marks "the next lesson". */}
          <div className="mt-12 grid max-w-xl grid-cols-[3rem_1fr] gap-x-3 xl:max-w-2xl" aria-hidden="true">
            <div />
            <div className="mb-2 grid grid-cols-5 gap-3 px-[calc(0.75rem+1px)] text-sm text-[#B4BCE0]">
              {["א׳", "ב׳", "ג׳", "ד׳", "ה׳"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-rows-4 gap-3 py-[calc(0.75rem+1px)] text-sm leading-none text-[#B4BCE0]">
              {["16:00", "17:00", "18:00", "19:00"].map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>
            <div className="rounded-xl border border-white/15 p-3">
              <div className="grid h-64 grid-cols-5 grid-rows-4 gap-3 xl:h-80">
                <div style={{ "--i": 0, gridColumn: 1, gridRow: "1 / span 2" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/10" />
                <div style={{ "--i": 1, gridColumn: 2, gridRow: "3 / span 2" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/10" />
                <div style={{ "--i": 2, gridColumn: 4, gridRow: "1 / span 1" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/10" />
                <div style={{ "--i": 3, gridColumn: 4, gridRow: "3 / span 2" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/10" />
                <div style={{ "--i": 4, gridColumn: 5, gridRow: "2 / span 2" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/10" />
                <div style={{ "--i": 5, gridColumn: 3, gridRow: "2 / span 1" } as React.CSSProperties}
                     className="login-block rounded-lg bg-white/20 ring-2 ring-white/85" />
              </div>
            </div>
          </div>
        </div>

        <div dir="ltr" className="text-[#B4BCE0] text-sm text-right">
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

          <h1 className="font-display text-3xl font-bold tracking-tight text-[#1B2A5C]">כניסה למערכת</h1>

          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-[#1B2A5C]">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[#C3C9E0] bg-white px-3.5 py-3 text-base text-[#1B2A5C] focus:outline-none focus:border-[#1B2A5C] focus:ring-4 focus:ring-[#FFD84D]/60"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-[#1B2A5C]">
                סיסמה
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#C3C9E0] bg-white px-3.5 py-3 pl-12 text-base text-[#1B2A5C] focus:outline-none focus:border-[#1B2A5C] focus:ring-4 focus:ring-[#FFD84D]/60"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                  title={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 flex w-12 items-center justify-center rounded-l-lg text-[#5B6384] hover:text-[#1B2A5C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D]/70"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.77 19.77 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.86 19.86 0 0 1-3.17 4.19" />
                        <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              {/* placeholder: will send a password reset email once that feature exists */}
              <button
                type="button"
                className="self-start text-sm font-semibold text-[#3B4A8C] hover:text-[#1B2A5C] hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D]/70"
              >
                שכחתי סיסמה
              </button>
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
              התחברות
            </button>
          </form>

          {CONTACT_PHONE && (
          <div className="mt-10 border-t border-[#DDE1EF] pt-6">
            <p className="text-sm text-[#5B6384]">צריכים עזרה? כתבו לי בוואטסאפ</p>
            <a
              href={`https://wa.me/${whatsappDigits(CONTACT_PHONE)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block text-base font-semibold text-[#1B2A5C] underline decoration-[#FFD84D] decoration-2 underline-offset-4 hover:decoration-[#1B2A5C] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FFD84D]/70 rounded"
            >
              <bdi dir="ltr">{CONTACT_PHONE}</bdi>
            </a>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;