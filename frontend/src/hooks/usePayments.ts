import { useCallback, useEffect, useState } from "react";
import { apiFetch, readErrorMessage } from "../utils/api";
import type { Student } from "../types";
import type { Debt, Payment } from "../types/payment";

/* Payments and balances for whichever role is viewing. The two roles hit
   completely different endpoints - the teacher gets every payment and every
   student's balance, a student gets only their own. */
export function usePayments(role: string) {
    const isTeacher = role === "TEACHER";

    const [payments, setPayments] = useState<Payment[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [allDebts, setAllDebts] = useState<Debt[]>([]);
    const [ownDebt, setOwnDebt] = useState<Debt | null>(null);
    const [errorMessage, setErrorMessage] = useState("");

    /* Loads every student's outstanding debt (teacher only) */
    const loadAllDebts = useCallback(async () => {
        const response = await apiFetch(`/teacher/debts`);
        if (!response.ok) {
            setErrorMessage("טעינת החובות נכשלה");
            return;
        }
        setAllDebts((await response.json()) as Debt[]);
    }, []);

    /* Loads the view matching the current role */
    useEffect(() => {
        async function loadTeacherView() {
            const [studentsRes, paymentsRes] = await Promise.all([
                apiFetch(`/teacher/students`),
                apiFetch(`/teacher/payments`),
            ]);

            if (studentsRes.ok) setStudents((await studentsRes.json()) as Student[]);
            else setErrorMessage("טעינת התלמידים נכשלה");

            if (paymentsRes.ok) setPayments((await paymentsRes.json()) as Payment[]);
            else setErrorMessage("טעינת התשלומים נכשלה");

            loadAllDebts();
        }

        async function loadStudentView() {
            const [paymentsRes, debtRes] = await Promise.all([
                apiFetch(`/student/payments`),
                apiFetch(`/student/debt`),
            ]);

            if (paymentsRes.ok) setPayments((await paymentsRes.json()) as Payment[]);
            else setErrorMessage("טעינת התשלומים נכשלה");

            if (debtRes.ok) setOwnDebt((await debtRes.json()) as Debt);
            else setErrorMessage("טעינת החוב נכשלה");
        }

        if (isTeacher) loadTeacherView();
        else loadStudentView();
    }, [isTeacher, loadAllDebts]);

    /* Teacher records a new payment. Returns an error message, or null on
       success, so the caller decides where to show it */
    async function createPayment(body: {
        studentId: number; amount: number; method: string; notes: string; paymentDate: string;
    }): Promise<string | null> {
        const response = await apiFetch(`/teacher/payments`, {
            method: "POST",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return await readErrorMessage(response, "רישום התשלום נכשל");
        }

        const created = (await response.json()) as Payment;
        setPayments((current) => [...current, created]);
        /* A new payment changes that student's balance, so the debt snapshot
           needs refreshing too */
        loadAllDebts();
        return null;
    }

    /* Updates a payment, including moving it to a different student if it was
       logged against the wrong one - refreshing debts after picks up the
       corrected balance for both students */
    async function updatePayment(paymentId: number, body: {
        studentId: number; amount: number; method: string; notes: string; paymentDate: string;
    }): Promise<string | null> {
        const response = await apiFetch(`/teacher/payments/${paymentId}`, {
            method: "PUT",
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return await readErrorMessage(response, "שמירת התשלום נכשלה");
        }

        const saved = (await response.json()) as Payment;
        setPayments((current) => current.map((p) => (p.id === saved.id ? saved : p)));
        loadAllDebts();
        return null;
    }

    /* Confirms with the teacher, then cancels a payment and refreshes debts */
    async function cancelPayment(payment: Payment) {
        setErrorMessage("");

        const confirmed = window.confirm(
            `לבטל תשלום של ₪${payment.amount} מאת ${payment.studentFirstName} ${payment.studentLastName}? הביטול יגדיל את החוב שלו.`
        );
        if (!confirmed) return;

        const response = await apiFetch(`/teacher/payments/${payment.id}`, { method: "DELETE" });

        if (!response.ok) {
            setErrorMessage(await readErrorMessage(response, "ביטול התשלום נכשל"));
            return;
        }

        setPayments((current) => current.filter((p) => p.id !== payment.id));
        loadAllDebts();
    }

    return {
        payments, students, allDebts, ownDebt,
        errorMessage, setErrorMessage,
        createPayment, updatePayment, cancelPayment,
    };
}
