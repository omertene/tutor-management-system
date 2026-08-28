/* Small prev/next footer shared by the dashboard panels that page their
   list (Outstanding debt, Needs completion) - pulled out so both don't
   keep their own copy of the same markup. */

type PanelPagerProps = {
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
};

export default function PanelPager({ page, totalPages, onChange }: PanelPagerProps) {
    const linkClass = "text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:text-slate-300 disabled:cursor-default";

    return (
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <button onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0} className={linkClass}>
                &larr; Previous
            </button>
            <span className="text-xs text-slate-400">
                Page {page + 1} of {totalPages}
            </span>
            <button
                onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className={linkClass}
            >
                Next &rarr;
            </button>
        </div>
    );
}
