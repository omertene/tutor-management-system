import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/* Shared frame for the small account screens (forgot / reset password): the same colors and
   fonts as the login screen, in Hebrew right-to-left, with one centered column. */
function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      dir="rtl"
      lang="he"
      className="font-login min-h-screen w-full flex items-center justify-center bg-[#F5F6FA] px-6 py-12"
    >
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="font-display mb-10 flex items-center gap-2.5 text-xl font-bold tracking-tight text-[#1B2A5C]"
        >
          <span className="inline-block h-5 w-5 rounded-[5px] bg-[#FFD84D]" aria-hidden="true" />
          TutorHub
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#1B2A5C]">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;
