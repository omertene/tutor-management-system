// client-side field checks, mirroring AccountValidation on the backend. these are a
// convenience so the user gets an error without a round trip - the server validates
// the same rules again and is the one that actually enforces them.
//
// AddStudentModal, RegisterPage and SettingsPage each carried their own byte-identical
// copies of all four before this.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d+$/;

// each returns an error message, or null when the value is fine
export function validateEmailField(email: string): string | null {
    if (!EMAIL_PATTERN.test(email)) return "Please enter a valid email address";
    return null;
}

export function validatePasswordField(password: string): string | null {
    if (password.length < 4) return "Password must be at least 4 characters";
    return null;
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
