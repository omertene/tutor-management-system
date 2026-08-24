import { useState } from "react";
import PanelPager from "./PanelPager";
import type { Debt } from "../../types/dashboard";

const DEBT_PAGE_SIZE = 5;

export default function OutstandingDebtPanel({ debts }: { debts: Debt[] }) {
    const [page, setPage] = useState(0);

    const totalPages = Math.max(1, Math.ceil(debts.length / DEBT_PAGE_SIZE));
    // clamped rather than stored, so deleting the last row on the final page can't
    // leave the pager pointing past the end of the list
    const safePage = Math.min(page, totalPages - 1);
    const pageItems = debts.slice(safePage * DEBT_PAGE_SIZE, (safePage + 1) * DEBT_PAGE_SIZE);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-900">Outstanding debt</h2>
            </div>
            <div className="divide-y divide-slate-100">
                {debts.length === 0 && (
                    <p className="px-6 py-6 text-sm text-slate-500 text-center">No outstanding debt.</p>
                )}
                {pageItems.map((debt) => (
                    <div key={debt.studentId} className="px-6 py-3 flex items-center justify-between gap-2">
                        <span className="text-slate-900 text-sm">
                            {debt.studentFirstName} {debt.studentLastName}
                        </span>
                        <span className="font-medium text-red-600 text-sm">₪{debt.debt}</span>
                    </div>
                ))}
            </div>
            {debts.length > DEBT_PAGE_SIZE && (
                <PanelPager page={safePage} totalPages={totalPages} onChange={setPage} />
            )}
        </div>
    );
}
