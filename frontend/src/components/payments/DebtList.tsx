import { formatMoney } from "../../utils/money";
import ListPager from "../ListPager";
import { usePagination } from "../../hooks/usePagination";
import type { Debt } from "../../types/payment";

/* Teacher's per-student balance list, filtered by search and sorted with
   the biggest debt first. */

const DEBTS_PER_PAGE = 10;

type DebtListProps = {
    debts: Debt[];
    searchQuery: string;
};

export default function DebtList({ debts, searchQuery }: DebtListProps) {
    const filtered = debts
        .filter((debt) => {
            if (!searchQuery.trim()) return true;
            const fullName = `${debt.studentFirstName} ${debt.studentLastName}`.toLowerCase();
            return fullName.includes(searchQuery.trim().toLowerCase());
        })
        .sort((a, b) => b.debt - a.debt);

    const { page, totalPages, visibleItems, setPage } = usePagination(filtered, DEBTS_PER_PAGE, searchQuery);

    return (
        <div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                {visibleItems.length === 0 && (
                    <p className="px-4 py-6 text-sm text-slate-500 text-center">
                        {debts.length === 0 ? "אין חובות עדיין." : "לא נמצאו תלמידים התואמים לחיפוש."}
                    </p>
                )}
                {visibleItems.map((debt) => (
                    <div key={debt.studentId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-900">
                            {debt.studentFirstName} {debt.studentLastName}
                        </span>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500">חויב: {formatMoney(debt.totalOwed)}</span>
                            <span className="text-slate-500">שולם: {formatMoney(debt.totalPaid)}</span>
                            <span className={`font-medium ${debt.debt > 0 ? "text-red-600" : "text-green-600"}`}>
                                יתרה: {formatMoney(debt.debt)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length > 0 && (
                <ListPager
                    page={page}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    perPage={DEBTS_PER_PAGE}
                    onChange={setPage}
                />
            )}
        </div>
    );
}
