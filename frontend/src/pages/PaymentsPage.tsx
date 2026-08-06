import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { decodeToken } from "../utils/jwt";
import type { Student } from "../types";

const API_BASE_URL = "http://localhost:8080";

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

        // the debt list is a separate snapshot that doesn't know a payment just
        // changed - refetch it so it doesn't silently go stale after a cancel
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

    return (

        <div>
            <h1>Payments</h1>

            {role === "TEACHER" && (
                <div>
                    <h2>Record a payment</h2>

                    <button onClick={handleLoadStudents}>load students</button>

                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        <option value="">select student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                            </option>
                        ))}
                    </select>

                    <input
                        type="number"
                        placeholder="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />

                    <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank transfer</option>
                        <option value="BIT">Bit</option>
                        <option value="CREDIT_CARD">Credit card</option>
                        <option value="PAYBOX">Paybox</option>
                    </select>

                    <input
                        placeholder="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />

                    <button onClick={handleCreatePayment}>record payment</button>

                    <br />

                    <button
                        onClick={() => handleLoadPaymentsForStudent(Number(selectedStudentId))}
                        disabled={!selectedStudentId}
                    >
                        show payments for selected student
                    </button>
                </div>
            )}

            {role === "STUDENT" && (
                <div>
                    <button onClick={handleLoadOwnPayments}>show my payments</button>
                </div>
            )}

            <ul>
                {payments.map((payment) => (
                    <li key={payment.id}>
                        {payment.createdAt} — {payment.amount} ({payment.method})
                        {payment.notes && ` — ${payment.notes}`}
                        {role === "TEACHER" && (
                            <>
                                {" "}
                                <button onClick={() => handleCancelPayment(payment.id)}>cancel</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>

            <h2>Debt</h2>

            {role === "STUDENT" && (
                <div>
                    <button onClick={handleLoadOwnDebt}>show my debt</button>
                    {ownDebt && (
                        <p>
                            Owed: {ownDebt.totalOwed} — Paid: {ownDebt.totalPaid} — Balance: {ownDebt.debt}
                        </p>
                    )}
                </div>
            )}

            {role === "TEACHER" && (
                <div>
                    <button onClick={handleLoadAllDebts}>show all students' debts</button>
                    <ul>
                        {allDebts.map((debt) => (
                            <li key={debt.studentId}>
                                {debt.studentFirstName} {debt.studentLastName} — owed: {debt.totalOwed}, paid: {debt.totalPaid}, balance: {debt.debt}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {errorMessage && <p>{errorMessage}</p>}

            <br />
            <LogoutButton />
        </div>
    )
}

export default PaymentsPage;
