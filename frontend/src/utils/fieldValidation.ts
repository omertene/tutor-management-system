/* Client-side field checks, mirroring AccountValidation on the backend - a
   convenience so the user gets an error without a round trip. The server
   validates the same rules again and is what actually enforces them. */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d+$/;

/* Each returns an error message, or null when the value is fine */
export function validateEmailField(email: string): string | null {
    if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address";
    return null;
}

/* What is wrong with a password, if anything - the same rule as AccountValidation on the backend:
   8-64 characters with at least one letter and one digit */
export function passwordProblem(password: string): "short" | "long" | "weak" | null {
    if (password.length < 8) return "short";
    if (password.length > 64) return "long";
    if (!/\p{L}/u.test(password) || !/\p{Nd}/u.test(password)) return "weak";
    return null;
}

export function validatePasswordField(password: string): string | null {
    switch (passwordProblem(password)) {
        case "short": return "Password must be at least 8 characters";
        case "long": return "Password must be at most 64 characters";
        case "weak": return "Password must contain at least one letter and one digit";
        default: return null;
    }
}

export function validatePhoneField(phone: string): string | null {
    if (!PHONE_PATTERN.test(phone)) return "Phone number must contain digits only";
    return null;
}

export function validateHourlyRateField(hourlyRate: string): string | null {
    if (!PHONE_PATTERN.test(hourlyRate) || Number(hourlyRate) <= 0) {
        return "Hourly rate must be a positive whole number";
    }
    return null;
}
