
import { Link, useNavigate } from "react-router-dom";
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

  /* Decorative week sketch: a = free slot, l = booked lesson, . = empty. Sun-Thu, right to left. */
  const sketch = [
    ["א׳", "aa.a"],
    ["ב׳", ".aa."],
    ["ג׳", "al.a"],
    ["ד׳", "aaa."],
    ["ה׳", ".aal"],
  ];

  return (
    <div dir="rtl" lang="he" className="font-login min-h-[100dvh] w-full flex flex-wrap bg-slate-50 overflow-x-hidden">
      {/* branding panel, hidden on small screens */}
      <div className="hidden lg:flex flex-[1.5_1_520px] flex-col justify-between gap-10 px-16 py-12 text-white bg-[linear-gradient(160deg,#18214f_0%,#1e2a66_55%,#27377d_100%)]">
        <div dir="ltr" className="login-zoom flex items-center gap-3 self-start text-[26px] font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#fbbf24]" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#18214f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
<path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
          </span>
          omerlessons
        </div>

        <div className="login-zoom">
          <h2 className="text-6xl font-extrabold leading-[1.08] tracking-tight">מתי השיעור הבא?</h2>
          <p className="mt-5 text-xl text-balance leading-relaxed text-[#e0e7ff]">
            לוח שיעורים, תשלומים וחומרי לימוד - הכל במקום אחד.
          </p>

          <div className="mt-10 max-w-[620px] rounded-[24px] border border-white/20 bg-white/[0.08] p-6" aria-hidden="true">
            <div className="flex gap-3">
              {sketch.map(([day, cells]) => (
                <div key={day} className="flex flex-1 flex-col gap-3">
                  <div className="text-center text-base text-[#c7d2fe]">{day}</div>
                  {cells.split("").map((c, i) => (
                    <div
                      key={i}
                      className={
                        "h-[46px] rounded-xl border " +
                        (c === "l"
                          ? "border-[#fbbf24] bg-[#fbbf24]"
                          : c === "a"
                            ? "border-white/30 bg-white/[0.14]"
                            : "border-white/10")
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-6 text-base text-[#e0e7ff]">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-white/30 bg-white/[0.14]" />פנוי
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-[#fbbf24]" />שיעור
              </span>
            </div>
          </div>
        </div>

        <div dir="ltr" className="login-zoom self-start text-sm text-[#c7d2fe]">
          &copy; {new Date().getFullYear()} omerlessons
        </div>
      </div>

      {/* the actual login form */}
      <div className="flex flex-[1_1_480px] items-center justify-center px-6 py-4 lg:py-12">
        <div className="login-zoom flex w-full max-w-[400px] flex-col gap-4 sm:gap-7">
          <div dir="ltr" className="lg:hidden flex items-center gap-2.5 self-start text-xl font-extrabold tracking-tight text-[#1e2a66]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#fbbf24]" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18214f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
<path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
              </svg>
            </span>
            omerlessons
          </div>

          <div>
            <h1 className="text-[28px] sm:text-[34px] font-extrabold tracking-tight text-slate-900">ברוכים הבאים!</h1>
            <p className="mt-2 text-[17px] text-slate-600">התחברו כדי לראות את השיעורים שלכם.</p>
          </div>

          <form
            className="flex flex-col gap-3.5 sm:gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[15px] font-semibold text-slate-800">
                אימייל
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="username"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 sm:h-[52px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-4 text-right text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e2a66] focus:ring-4 focus:ring-[#1e2a66]/20"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[15px] font-semibold text-slate-800">
                  סיסמה
                </label>
                {/* opens the "forgot password" screen, carrying over any email already typed */}
                <Link
                  to="/forgot-password"
                  state={{ email }}
                  className="text-sm font-semibold text-[#3249b0] hover:text-[#1e2a66] hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e2a66]/30"
                >
                  שכחתי סיסמה
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  autoComplete="current-password"
                  required
                  placeholder="הסיסמה שלכם"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 sm:h-[52px] w-full rounded-xl border-[1.5px] border-slate-300 bg-white pl-4 pr-[52px] text-right text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e2a66] focus:ring-4 focus:ring-[#1e2a66]/20"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                  title={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-1.5 right-1.5 flex w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-[#eef1f8] hover:text-[#1e2a66] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e2a66]/30"
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
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#991b1b]">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="h-12 sm:h-[52px] w-full rounded-xl bg-[#1e2a66] text-[17px] font-bold text-white transition-colors hover:bg-[#18214f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e2a66]/30"
            >
              התחברות
            </button>
          </form>

          {CONTACT_PHONE && (
            <div className="flex flex-col gap-2 sm:gap-3 border-t border-slate-200 pt-4 sm:pt-6">
              <p className="text-base font-bold text-slate-800">צריכים עזרה?</p>
              <a
                href={`https://wa.me/${whatsappDigits(CONTACT_PHONE)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[14px] border border-[#bbf7d0] bg-[#dcfce7] px-4 py-3 transition-colors hover:bg-[#bbf7d0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#16a34a]/30"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#16a34a]" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.7-5.3A8.4 8.4 0 1 1 21 11.5z" />
                    <path transform="translate(7 7) scale(0.42)" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="3.2" />
                  </svg>
                </span>
                <span className="text-base font-medium text-[#14532d]">כתבו לי בווטסאפ:</span>
                <bdi dir="ltr" className="text-[17px] font-extrabold text-[#052e16]">{CONTACT_PHONE}</bdi>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
