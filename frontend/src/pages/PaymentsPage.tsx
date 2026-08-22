import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import { readErrorMessage } from "../utils/httpError";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
    { label: "Settings", to: "/teacher/settings" },
];

const studentLinks = [
    { label: "Lessons", to: "/student/lessons" },
    { label: "Payments", to: "/student/payments" },
    { label: "Materials", to: "/student/materials" },
];

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "BIT" | "CREDIT_CARD" | "PAYBOX";

type Payment = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    amount: number;
    method: PaymentMethod;
    notes: string;
    paymentDate: string;
    createdAt: string;
}

type Debt = {
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    totalOwed: number;
    totalPaid: number;
    debt: number;
}

// insertion order here drives the dropdown order - Paybox then Bit listed first
// per how the teacher actually gets paid most often
const methodLabels: Record<PaymentMethod, string> = {
    PAYBOX: "Paybox",
    BIT: "Bit",
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    CREDIT_CARD: "Credit card",
};

// "2026-10-07T18:00:00" -> "7/10/26 18:00"
function formatPaymentDate(dateTime: string): string {
    const [datePart, timePart] = dateTime.split("T");
    const [year, month, day] = datePart.split("-");
    const time = timePart ? timePart.slice(0, 5) : "";
    return `${Number(day)}/${Number(month)}/${year.slice(2)} ${time}`;
}

// "2026-10-07" -> "7/10/26"
function formatDateOnly(date: string): string {
    const [year, month, day] = date.split("-");
    return `${Number(day)}/${Number(month)}/${year.slice(2)}`;
}

// today as "YYYY-MM-DD", for defaulting the date input
function todayDateString(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function PaymentsPage() {

    const token = localStorage.getItem("token")!;
    const { role } = decodeToken(token);

    const [payments, setPayments] = useState<Payment[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [students, setStudents] = useState<Student[]>([]);

    // teacher's "record a payment" form fields (top panel - create only)
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("PAYBOX");
    const [notes, setNotes] = useState("");
    const [paymentDate, setPaymentDate] = useState(todayDateString());

    // inline edit panel state - which payment row is expanded for editing, and its
    // own separate set of field values, kept apart from the "record a payment" form above
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
    const [editStudentId, setEditStudentId] = useState("");
    const [editAmount, setEditAmount] = useState("");
    const [editMethod, setEditMethod] = useState<PaymentMethod>("PAYBOX");
    const [editNotes, setEditNotes] = useState("");
    const [editPaymentDate, setEditPaymentDate] = useState(todayDateString());
    // separate from errorMessage above - the page-level error banner renders way up
    // near the top of the page, which is out of view while editing a row further down
    // the list, so a rejected edit (e.g. a negative amount) needs its own message
    // shown right next to the edit panel instead
    const [editErrorMessage, setEditErrorMessage] = useState("");

    // debt views
    const [ownDebt, setOwnDebt] = useState<Debt | null>(null);
    const [allDebts, setAllDebts] = useState<Debt[]>([]);

    // shared student-name search that filters both the payment history and the
    // debt list at once, since they're both "everything about this student's money"
    const [studentSearchQuery, setStudentSearchQuery] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const PAYMENTS_PER_PAGE = 10;

    const [debtPage, setDebtPage] = useState(1);
    const DEBTS_PER_PAGE = 10;

    async function handleLoadStudents() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load students");
            return;
        }

        const data = await response.json();
        setStudents(data);
    }

    // teacher views every payment across every student - GET /teacher/payments
    async function handleLoadAllPayments() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/payments`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load payments");
            return;
        }

        const data = await response.json();
        setPayments(data);
    }

    // student views their own payments - GET /student/payments
    async function handleLoadOwnPayments() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/student/payments`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load payments");
            return;
        }

        const data = await response.json();
        setPayments(data);
    }

    // student views their own balance
    async function handleLoadOwnDebt() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/student/debt`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load debt");
            return;
        }

        const data = await response.json();
        setOwnDebt(data);
    }

    // teacher views every student's balance at once - GET /teacher/debts
    async function handleLoadAllDebts() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/debts`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load debts");
            return;
        }

        const data = await response.json();
        setAllDebts(data);
    }

    useEffect(() => {
        if (role === "TEACHER") {
            handleLoadStudents();
            handleLoadAllPayments();
            handleLoadAllDebts();
        } else {
            handleLoadOwnPayments();
            handleLoadOwnDebt();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        setDebtPage(1);
    }, [studentSearchQuery]);

    // teacher records a new payment - POST /teacher/payments
    async function handleCreatePayment() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(selectedStudentId),
                amount: Number(amount),
                method,
                notes,
                paymentDate,
            }),
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to record payment"));
            return;
        }

        const createdPayment = await response.json();
        setPayments([...payments, createdPayment]);
        setSelectedStudentId("");
        setAmount("");
        setMethod("PAYBOX");
        setNotes("");
        setPaymentDate(todayDateString());

        // a new payment changes the student's balance, so the debt snapshot
        // needs refreshing too
        handleLoadAllDebts();
    }

    // opens the inline edit panel on a payment row, pre-filled with that payment's
    // current values - kept separate from the "record a payment" form above so
    // editing one doesn't disturb whatever the teacher was mid-typing into the other
    function handleStartEdit(payment: Payment) {
        setEditErrorMessage("");
        setEditingPaymentId(payment.id);
        setEditStudentId(String(payment.studentId));
        setEditAmount(String(payment.amount));
        setEditMethod(payment.method);
        setEditNotes(payment.notes ?? "");
        setEditPaymentDate(payment.paymentDate ?? todayDateString());
    }

    function handleCancelEdit() {
        setEditingPaymentId(null);
        setEditErrorMessage("");
    }

    // saves the inline edit panel - PUT /teacher/payments/{id}. student is editable
    // here (unlike before), so a payment logged against the wrong student can be
    // reassigned; debt is derived per-student on read, so refreshing the debt list
    // after this picks up the corrected balance for both the old and new student.
    async function handleSaveEdit(paymentId: number) {
        setEditErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/payments/${paymentId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(editStudentId),
                amount: Number(editAmount),
                method: editMethod,
                notes: editNotes,
                paymentDate: editPaymentDate,
            }),
        });

        if (!response.ok) {
            setEditErrorMessage(await readErrorMessage(response, "Failed to save payment"));
            return;
        }

        const savedPayment = await response.json();
        setPayments(payments.map((p) => (p.id === savedPayment.id ? savedPayment : p)));
        setEditingPaymentId(null);

        // covers both the old and new student's balance if the student was changed
        handleLoadAllDebts();
    }

    async function handleCancelPayment(payment: Payment) {
        setErrorMessage("");

        const confirmed = window.confirm(
            `Cancel this ₪${payment.amount} payment from ${payment.studentFirstName} ${payment.studentLastName}? This will increase their outstanding debt.`
        );
        if (!confirmed) return;

        const response = await fetch(`${API_BASE_URL}/teacher/payments/${payment.id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "Failed to cancel payment"));
            return;
        }

        setPayments(payments.filter((p) => p.id !== payment.id));

        handleLoadAllDebts();
    }

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const labelClass = "text-sm font-medium text-slate-700";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const smallSecondaryButtonClass = "px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    const filteredPayments = payments
        .filter((payment) => {
            if (!studentSearchQuery.trim()) return true;
            const fullName = `${payment.studentFirstName} ${payment.studentLastName}`.toLowerCase();
            return fullName.includes(studentSearchQuery.trim().toLowerCase());
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAYMENTS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const visiblePayments = filteredPayments.slice(
        (safePage - 1) * PAYMENTS_PER_PAGE,
        safePage * PAYMENTS_PER_PAGE
    );

    const filteredDebts = allDebts
        .filter((debt) => {
            if (!studentSearchQuery.trim()) return true;
            const fullName = `${debt.studentFirstName} ${debt.studentLastName}`.toLowerCase();
            return fullName.includes(studentSearchQuery.trim().toLowerCase());
        })
        .sort((a, b) => b.debt - a.debt);

    const debtTotalPages = Math.max(1, Math.ceil(filteredDebts.length / DEBTS_PER_PAGE));
    const safeDebtPage = Math.min(debtPage, debtTotalPages);
    const visibleDebts = filteredDebts.slice(
        (safeDebtPage - 1) * DEBTS_PER_PAGE,
        safeDebtPage * DEBTS_PER_PAGE
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Record a payment</h2>

                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Student *</label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">Select student</option>
                                    {students.map((student) => (
                                        <option key={student.id} value={student.id}>
                                            {student.firstName} {student.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Amount *</label>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`${inputClass} w-32`}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Date received *</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Method</label>
                                <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                                    {Object.entries(methodLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className={labelClass}>Notes (optional)</label>
                                <input
                                    placeholder="Notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <button
                                onClick={handleCreatePayment}
                                disabled={!selectedStudentId || !amount || !paymentDate}
                                className={primaryButtonClass}
                            >
                                Record payment
                            </button>
                        </div>
                    </div>
                )}

                {role === "TEACHER" && (
                    <div className="mt-8">
                        <input
                            type="text"
                            placeholder="Search by student name..."
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className={`${inputClass} w-full max-w-sm`}
                        />
                    </div>
                )}

                <div className="mt-4">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment history</h2>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {visiblePayments.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                {payments.length === 0 ? "No payments yet." : "No payments match your search."}
                            </p>
                        )}

                        {visiblePayments.map((payment) => (
                            <div key={payment.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-900">₪{payment.amount}</span>
                                    {role === "TEACHER" && (
                                        <span className="text-slate-500 text-sm">
                                            {payment.studentFirstName} {payment.studentLastName}
                                        </span>
                                    )}
                                    <span className="text-slate-500 text-sm">{methodLabels[payment.method] ?? payment.method}</span>
                                    <span className="text-slate-400 text-sm">
                                        {payment.paymentDate ? formatDateOnly(payment.paymentDate) : formatPaymentDate(payment.createdAt)}
                                    </span>
                                    {payment.notes && <span className="text-slate-500 text-sm">— {payment.notes}</span>}
                                </div>

                                {role === "TEACHER" && editingPaymentId === payment.id && (
                                    <div className="flex flex-wrap gap-2 items-end bg-slate-50 border border-slate-200 rounded-lg p-3 w-full mt-1">
                                        {editErrorMessage && (
                                            <p className="text-sm text-red-600 w-full">{editErrorMessage}</p>
                                        )}

                                        <div className="flex flex-col gap-1">
                                            <label className={labelClass}>Student</label>
                                            <select
                                                value={editStudentId}
                                                onChange={(e) => setEditStudentId(e.target.value)}
                                                className={inputClass}
                                            >
                                                {students.map((student) => (
                                                    <option key={student.id} value={student.id}>
                                                        {student.firstName} {student.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className={labelClass}>Amount</label>
                                            <input
                                                type="number"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                                className={`${inputClass} w-28`}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className={labelClass}>Date received</label>
                                            <input
                                                type="date"
                                                value={editPaymentDate}
                                                onChange={(e) => setEditPaymentDate(e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className={labelClass}>Method</label>
                                            <select
                                                value={editMethod}
                                                onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                                                className={inputClass}
                                            >
                                                {Object.entries(methodLabels).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                                            <label className={labelClass}>Notes</label>
                                            <input
                                                value={editNotes}
                                                onChange={(e) => setEditNotes(e.target.value)}
                                                className={`${inputClass} w-full`}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleSaveEdit(payment.id)}
                                            disabled={!editStudentId || !editAmount || !editPaymentDate}
                                            className={primaryButtonClass}
                                        >
                                            Save changes
                                        </button>
                                        <button onClick={handleCancelEdit} className={smallSecondaryButtonClass}>
                                            Cancel
                                        </button>
                                    </div>
                                )}

                                {role === "TEACHER" && editingPaymentId !== payment.id && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStartEdit(payment)}
                                            className={smallSecondaryButtonClass}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleCancelPayment(payment)}
                                            className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {filteredPayments.length > 0 && (
                        <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-slate-500">
                                Showing {(safePage - 1) * PAYMENTS_PER_PAGE + 1}-{Math.min(safePage * PAYMENTS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage === 1}
                                    className={smallSecondaryButtonClass}
                                >
                                    &larr; Previous
                                </button>
                                <span className="text-sm text-slate-500">Page {safePage} of {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage === totalPages}
                                    className={smallSecondaryButtonClass}
                                >
                                    Next &rarr;
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Debt</h2>

                    {role === "STUDENT" && ownDebt && (
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

                    {role === "TEACHER" && (
                        <div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {visibleDebts.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">
                                        {allDebts.length === 0 ? "No debts yet." : "No students match your search."}
                                    </p>
                                )}
                                {visibleDebts.map((debt) => (
                                    <div key={debt.studentId} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium text-slate-900">
                                            {debt.studentFirstName} {debt.studentLastName}
                                        </span>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-slate-500">Owed: ₪{debt.totalOwed}</span>
                                            <span className="text-slate-500">Paid: ₪{debt.totalPaid}</span>
                                            <span className={`font-medium ${debt.debt > 0 ? "text-red-600" : "text-green-600"}`}>
                                                Balance: ₪{debt.debt}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredDebts.length > 0 && (
                                <div className="mt-3 flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        Showing {(safeDebtPage - 1) * DEBTS_PER_PAGE + 1}-{Math.min(safeDebtPage * DEBTS_PER_PAGE, filteredDebts.length)} of {filteredDebts.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setDebtPage((p) => Math.max(1, p - 1))}
                                            disabled={safeDebtPage === 1}
                                            className={smallSecondaryButtonClass}
                                        >
                                            &larr; Previous
                                        </button>
                                        <span className="text-sm text-slate-500">Page {safeDebtPage} of {debtTotalPages}</span>
                                        <button
                                            onClick={() => setDebtPage((p) => Math.min(debtTotalPages, p + 1))}
                                            disabled={safeDebtPage === debtTotalPages}
                                            className={smallSecondaryButtonClass}
                                        >
                                            Next &rarr;
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default PaymentsPage;
