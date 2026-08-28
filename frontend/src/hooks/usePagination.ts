import { useEffect, useState } from "react";

/* 1-based pagination over an already-filtered array. The page number is clamped
   so removing the last item on the final page can't strand the list on an
   empty page. resetKey resets back to page 1 whenever the filters change. */
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
