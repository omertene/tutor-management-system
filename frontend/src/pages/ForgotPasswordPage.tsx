import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { API_BASE_URL } from "../utils/api";
import { authButton, authError, authInput, authLabel, authLink, authSuccess } from "../constants/authStyles";

/* "Forgot password": asks for the login email and requests a reset link. The server answers the
   same way whether or not the address is registered, so this screen does too. */
function ForgotPasswordPage() {
  const location = useLocation();
  /* the login screen passes along whatever email was already typed */
  const prefill = (location.state as { email?: string } | null)?.email ?? "";

  const [email, setEmail] = useState(prefill);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* Sends the request; shows the "check your email" message on any successful answer */
  async function handleSubmit() {
    setErrorMessage("");
    if (!email.trim()) {
      setErrorMessage("יש להזין כתובת אימייל.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        setErrorMessage("לא הצלחנו לשלוח את הבקשה. נסו שוב בעוד רגע.");
        return;
      }
      setSent(true);
    } catch {
      setErrorMessage("אין חיבור לשרת. נסו שוב בעוד רגע.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="בדקו את תיבת המייל">
        <p role="status" className={`mt-6 ${authSuccess}`}>
          אם הכתובת רשומה במערכת, נשלח אליה קישור לאיפוס הסיסמה. הקישור תקף לשעה אחת.
        </p>
        <p className="mt-4 text-sm text-[#5B6384]">
          לא הגיע מייל? כדאי לבדוק בתיקיית הספאם, ואפשר לבקש קישור חדש בעוד דקה.
        </p>
        <Link to="/login" className={`mt-6 inline-block ${authLink}`}>
          חזרה להתחברות
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="שכחתי סיסמה">
      <p className="mt-2 text-base text-[#5B6384]">
        הזינו את כתובת האימייל שבה אתם נכנסים למערכת, ונשלח אליכם קישור לבחירת סיסמה חדשה.
      </p>

      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className={authLabel}>
            אימייל
          </label>
          <input
            id="email"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInput}
          />
        </div>

        {errorMessage && (
          <p role="alert" className={authError}>
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={sending} className={authButton}>
          {sending ? "שולח..." : "שליחת קישור"}
        </button>
      </form>

      <Link to="/login" className={`mt-6 inline-block ${authLink}`}>
        חזרה להתחברות
      </Link>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
