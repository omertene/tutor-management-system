// the Tailwind class strings shared by every form on the site. each of these was
// redeclared per page, and they had already drifted - the Materials page's "Add
// material" button used the secondary (white) style while the same action on every
// other page was the indigo primary.
//
// inputClass and inputClassFull are both kept because both are genuinely used: the
// full-width variant inside stacked modal forms, the auto-width one in the inline
// filter/toolbar rows where fields sit side by side.
export const inputClass =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

export const inputClassFull = "w-full " + inputClass;

export const labelClass = "text-sm font-medium text-slate-700";

export const primaryButtonClass =
    "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const smallSecondaryButtonClass =
    "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export const cardClass = "bg-white rounded-xl border border-slate-200 shadow-sm p-6";
