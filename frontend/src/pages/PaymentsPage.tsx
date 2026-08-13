import { useState } from "react";
import NavBar from "../components/NavBar";
import { decodeToken } from "../utils/jwt";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

const teacherLinks = [
    { label: "Students", to: "/teacher/register" },
    { label: "Subjects", to: "/teacher/subjects" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
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
    amount: number;
    method: PaymentMethod;
    notes: string;
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

function PaymentsPage() {

    const token = localStorage.getItem("token")!;
    const { role } = decodeToken(token);

    const [payments, setPayments] = useState<Payment[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [students, setStudents] = useState<Student[]>([]);

    // teacher's "record a payment" form fields
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<PaymentMethod>("CASH");
    const [notes, setNotes] = useState("");

    // debt views
    const [ownDebt, setOwnDebt] = useState<Debt | null>(null);
    const [allDebts, setAllDebts] = useState<Debt[]>([]);

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

    // teacher views a specific student's payments - GET /teacher/students/{id}/payments
    async function handleLoadPaymentsForStudent(studentId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/students/${studentId}/payments`, {
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

    // teacher records a payment - POST /teacher/payments
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
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to record payment");
            return;
        }

        const createdPayment = await response.json();
        setPayments([...payments, createdPayment]);

        // same reason as in handleCancelPayment - a new payment changes the
        // student's balance, so the debt snapshot needs refreshing too
        handleLoadAllDebts();
    }

    async function handleCancelPayment(paymentId: number) {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/payments/${paymentId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to cancel payment");
            return;
        }

        setPayments(payments.filter((payment) => payment.id !== paymentId));


        handleLoadAllDebts();
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

    const inputClass = "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
    const primaryButtonClass = "px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const secondaryButtonClass = "px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath={role === "TEACHER" ? "/teacher" : "/student"} links={role === "TEACHER" ? teacherLinks : studentLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Payments</h1>

                {errorMessage && <p className="text-sm text-red-600 mt-3">{errorMessage}</p>}

                {role === "TEACHER" && (
                    <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Record a payment</h2>

                        <div className="flex flex-wrap gap-3 items-center">
                            <button onClick={handleLoadStudents} className={secondaryButtonClass}>
                                Load students
                            </button>

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

                            <input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className={`${inputClass} w-32`}
                            />

                            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputClass}>
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank transfer</option>
                                <option value="BIT">Bit</option>
                                <option value="CREDIT_CARD">Credit card</option>
                                <option value="PAYBOX">Paybox</option>
                            </select>

                            <input
                                placeholder="Notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className={inputClass}
                            />

                            <button onClick={handleCreatePayment} className={primaryButtonClass}>
                                Record payment
                            </button>
                        </div>

                        <button
                            onClick={() => handleLoadPaymentsForStudent(Number(selectedStudentId))}
                            disabled={!selectedStudentId}
                            className={`${secondaryButtonClass} mt-4`}
                        >
                            Show payments for selected student
                        </button>
                    </div>
                )}

                {role === "STUDENT" && (
                    <div className="mt-6">
                        <button onClick={handleLoadOwnPayments} className={secondaryButtonClass}>
                            Show my payments
                        </button>
                    </div>
                )}

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Payment history</h2>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                        {payments.length === 0 && (
                            <p className="px-4 py-6 text-sm text-slate-500 text-center">No payments loaded yet.</p>
                        )}

                        {payments.map((payment) => (
                            <div key={payment.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-slate-900">₪{payment.amount}</span>
                                    <span className="text-slate-500 text-sm">{payment.method}</span>
                                    <span className="text-slate-400 text-sm">{payment.createdAt}</span>
                                    {payment.notes && <span className="text-slate-500 text-sm">— {payment.notes}</span>}
                                </div>
                                {role === "TEACHER" && (
                                    <button
                                        onClick={() => handleCancelPayment(payment.id)}
                                        className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Debt</h2>

                    {role === "STUDENT" && (
                        <div>
                            <button onClick={handleLoadOwnDebt} className={secondaryButtonClass}>
                                Show my debt
                            </button>
                            {ownDebt && (
                                <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-sm">
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
                        </div>
                    )}

                    {role === "TEACHER" && (
                        <div>
                            <button onClick={handleLoadAllDebts} className={secondaryButtonClass}>
                                Show all students' debts
                            </button>

                            <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                {allDebts.length === 0 && (
                                    <p className="px-4 py-6 text-sm text-slate-500 text-center">No debts loaded yet.</p>
                                )}
                                {allDebts.map((debt) => (
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
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default PaymentsPage;
