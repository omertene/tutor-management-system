export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "BIT" | "CREDIT_CARD" | "PAYBOX";

export type Payment = {
    id: number;
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    amount: number;
    method: PaymentMethod;
    notes: string;
    paymentDate: string;
    createdAt: string;
};

export type Debt = {
    studentId: number;
    studentFirstName: string;
    studentLastName: string;
    totalOwed: number;
    totalPaid: number;
    debt: number;
};

// insertion order here drives the dropdown order - Paybox then Bit listed first
// per how the teacher actually gets paid most often
export const methodLabels: Record<PaymentMethod, string> = {
    PAYBOX: "Paybox",
    BIT: "Bit",
    CASH: "Cash",
    BANK_TRANSFER: "Bank transfer",
    CREDIT_CARD: "Credit card",
};
