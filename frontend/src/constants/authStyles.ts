/* Tailwind classes shared by the small account screens (forgot / reset password), taken from the
   login form so all three look the same. */

export const authInput =
  "w-full h-[52px] rounded-xl border-[1.5px] border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1e2a66] focus:ring-4 focus:ring-[#1e2a66]/20";

export const authLabel = "text-[15px] font-semibold text-slate-800";

export const authButton =
  "h-[52px] w-full rounded-xl bg-[#1e2a66] text-[17px] font-bold text-white hover:bg-[#18214f] transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e2a66]/30 disabled:opacity-60 disabled:cursor-not-allowed";

export const authError =
  "rounded-xl bg-[#fef2f2] border border-[#fecaca] px-4 py-3 text-sm text-[#991b1b]";

export const authSuccess =
  "rounded-lg bg-[#E6F6EF] border border-[#9AD8BC] px-3.5 py-2.5 text-sm text-[#14583B]";

export const authLink =
  "text-sm font-semibold text-[#3249b0] hover:text-[#1e2a66] hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1e2a66]/30";
