import { useState } from "react";
import NavBar from "../components/NavBar";
import ListPager from "../components/ListPager";
import RecordPaymentForm from "../components/payments/RecordPaymentForm";
import PaymentRow from "../components/payments/PaymentRow";
import DebtList from "../components/payments/DebtList";
import { usePayments } from "../hooks/usePayments";
import { usePagination } from "../hooks/usePagination";
import { decodeToken } from "../utils/jwt";
import { inputClass } from "../constants/formStyles";
import { studentLinks, teacherLinks } from "../constants/navLinks";

const PAYMENTS_PER_PAGE = 10;

/* Payments page for both roles - the teacher sees payment history and every
   student's debt, a student sees their own payments and balance */
function PaymentsPage() {
    /* ProtectedRoute guarantees a token before this page renders - the ?? ""
       keeps decodeToken's signature honest, its try/catch handles a bad value */
    const token = localStorage.getItem("token") ?? "";
    const { role } = decodeToken(token);
    const isTeacher = role === "TEACHER";

    const {
        payments, students, allDebts, ownDebt,
        errorMessage, setErrorMessage,
        createPayment, updatePayment, cancelPayment,
    } = usePayments(role);

    /* One search box filters both the payment history and the debt list */
    const [searchQuery, setSearchQuery] = useState("");

    const filteredPayments = payments
        .filter((payment) => {
            if (!searchQuery.trim()) return true;
            const fullName = `${payment.studentFirstName} ${payment.studentLastName}`.toLowerCase();
            return fullName.includes(searchQuery.trim().toLowerCase());
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const { page, totalPages, visibleItems, setPage } = usePagination(
        filteredPayments, PAYMENTS_PER_PAGE, searchQuery
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={isTeacher ? "/teacher" : "/student"} links={isTeacher ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {isTeacher && (
                    <>
                        <RecordPaymentForm students={students} onSubmit={createPayment} onError={setErrorMessage} />

                        <div className="mt-8">
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${inputClass} w-full max-w-sm`}
                            />
                        </div>
                    </>
                )}

                <div className="mt-4">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment history</h2>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {visibleItems.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {payments.length === 0 ? "No payments yet." : "No payments match your search."}
                            </p>
                        )}

                        {visibleItems.map((payment) => (
                            <PaymentRow
                                key={payment.id}
                                payment={payment}
                                isTeacher={isTeacher}
                                students={students}
                                onSave={updatePayment}
                                onCancel={cancelPayment}
                            />
                        ))}
                    </div>

                    {filteredPayments.length > 0 && (
                        <ListPager
                            page={page}
                            totalPages={totalPages}
                            totalItems={filteredPayments.length}
                            perPage={PAYMENTS_PER_PAGE}
                            onChange={setPage}
                        />
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Debt</h2>

                    {!isTeacher && ownDebt && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-sm">
                            <p className="text-sm text-slate-500">Current balance</p>
                            <p className={`text-3xl font-semibold mt-1 ${ownDebt.debt > 0 ? "text-red-600" : "text-green-600"}`}>
                                ₪{ownDebt.debt}
                            </p>
                            <div className="mt-4 flex gap-6 text-sm text-slate-500">
                                <span>Owed: ₪{ownDebt.totalOwed}</span>
                                <span>Paid: ₪{ownDebt.totalPaid}</span>
                            </div>
                        </div>
                    )}

                    {isTeacher && <DebtList debts={allDebts} searchQuery={searchQuery} />}
                </div>
            </main>
        </div>
    );
}

export default PaymentsPage;
