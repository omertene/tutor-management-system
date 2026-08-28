import { smallSecondaryButtonClass } from "../constants/formStyles";

type ListPagerProps = {
    page: number; /* 1-based */
    totalPages: number;
    totalItems: number;
    perPage: number;
    onChange: (page: number) => void;
};

/* The "Showing 1-10 of 34" footer with prev/next, shared by every paginated
   list (payments, debts, lessons, materials) instead of each having its own copy */
export default function ListPager({ page, totalPages, totalItems, perPage, onChange }: ListPagerProps) {
    const firstShown = (page - 1) * perPage + 1;
    const lastShown = Math.min(page * perPage, totalItems);

    return (
        <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-slate-500">
                Showing {firstShown}-{lastShown} of {totalItems}
            </p>
            <div className="flex items-center gap-2">
                <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className={smallSecondaryButtonClass}>
                    &larr; Previous
                </button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={smallSecondaryButtonClass}>
                    Next &rarr;
                </button>
            </div>
        </div>
    );
}
