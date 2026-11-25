import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* Shared frame for the small account screens (forgot / reset password): the same colors and
   fonts as the login screen, in Hebrew right-to-left, with one centered column. */
function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="font-login min-h-screen w-full flex items-center justify-center bg-slate-50 px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          dir="ltr"
          className="mb-10 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#1e2a66]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#fbbf24]" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18214f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
<path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
            </svg>
          </span>
          omerlessons
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
