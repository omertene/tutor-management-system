import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { API_BASE_URL, readErrorMessage } from "../utils/api";
import { passwordProblem } from "../utils/fieldValidation";
import { authButton, authError, authInput, authLabel, authLink, authSuccess } from "../constants/authStyles";

const PASSWORD_HINT = "לפחות 8 תווים, כולל אות אחת וספרה אחת";

/* the same rules the server enforces, in Hebrew for this screen */
function passwordProblemText(password: string): string | null {
  switch (passwordProblem(password)) {
    case "short":
      return "הסיסמה חייבת להכיל לפחות 8 תווים.";
    case "long":
      return "הסיסמה יכולה להכיל עד 64 תווים.";
    case "weak":
      return "הסיסמה חייבת לכלול לפחות אות אחת וספרה אחת.";
    default:
      return null;
  }
}

/* Where the emailed link lands (/reset-password?token=...): the person picks a new password. */
function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* Checks the form, then sends the token with the new password */
  async function handleSubmit() {
    setErrorMessage("");

    const problem = passwordProblemText(password);
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    if (password !== confirm) {
      setErrorMessage("הסיסמאות אינן זהות.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (response.ok) {
        setDone(true);
        return;
      }

      const serverMessage = await readErrorMessage(response, "");
      if (response.status === 400 && serverMessage.includes("invalid or has expired")) {
        setLinkInvalid(true);
      } else {
        setErrorMessage("לא הצלחנו לעדכן את הסיסמה. נסו שוב.");
      }
    } catch {
      setErrorMessage("אין חיבור לשרת. נסו שוב בעוד רגע.");
    } finally {
      setSaving(false);
    }
  }

  if (!token || linkInvalid) {
    return (
      <AuthLayout title="הקישור לא תקף">
        <p role="alert" className={`mt-6 ${authError}`}>
          הקישור לאיפוס הסיסמה לא תקף או שפג תוקפו. אפשר לבקש קישור חדש.
        </p>
        <Link to="/forgot-password" className={`mt-6 inline-block ${authLink}`}>
          בקשת קישור חדש
        </Link>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="הסיסמה עודכנה">
        <p role="status" className={`mt-6 ${authSuccess}`}>
          הסיסמה שונתה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.
        </p>
        <Link to="/login" className={`${authButton} mt-6 block text-center`}>
          להתחברות
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="בחירת סיסמה חדשה">
      <form
        className="mt-8 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className={authLabel}>
            סיסמה חדשה
          </label>
          <input
            id="new-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
          />
          <p className="text-sm text-[#5B6384]">{PASSWORD_HINT}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className={authLabel}>
            אימות סיסמה
          </label>
          <input
            id="confirm-password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInput}
          />
        </div>

        {errorMessage && (
          <p role="alert" className={authError}>
            {errorMessage}
          </p>
        )}

        <button type="submit" disabled={saving} className={authButton}>
          {saving ? "שומר..." : "שמירת הסיסמה"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
