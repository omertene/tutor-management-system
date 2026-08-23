export type Subject = {
    id: number;
    name: string;
}

export type LoginResponse = {
    token: string;
    role: "TEACHER" | "STUDENT";
}

export type Student = {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    hourlyRate: number;
    educationLevel: string | null;
    notes: string | null;
    active: boolean;
}
