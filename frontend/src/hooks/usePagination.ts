import { useEffect, useState } from "react";

// 1-based pagination over an already-filtered array.
//
// the page number is clamped rather than stored blindly, so removing the last item on
// the final page can't strand the list on an empty page. resetKey resets to page 1
// whenever the filters change - otherwise searching while on page 3 shows "no results"
// for a query that does have matches.
export function usePagination<T>(items: T[], perPage: number, resetKey?: unknown) {
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [resetKey]);

    const totalPages = Math.max(1, Math.ceil(items.length / perPage));
    const safePage = Math.min(page, totalPages);
    const visibleItems = items.slice((safePage - 1) * perPage, safePage * perPage);

    return { page: safePage, totalPages, visibleItems, setPage };
}
