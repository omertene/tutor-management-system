
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { readErrorMessage } from "../utils/httpError";

const API_BASE_URL = "http://localhost:8080";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    setErrorMessage("");
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      setErrorMessage(await readErrorMessage(response, "Failed to log in"));
      return;
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    if (data.role === "TEACHER") {
        navigate("/teacher");
    } else if (data.role === "STUDENT") {
        navigate("/student");
    }
    console.log(data);
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* branding panel - hidden on small screens, fills the emptiness on desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 text-white flex-col justify-between p-12">
        <div className="text-xl font-semibold tracking-tight">TutorHub</div>

        <div>
          <h2 className="text-3xl font-semibold leading-snug mb-3">
            Your lessons, materials, and payments — all in one place.
          </h2>
          <p className="text-indigo-100 text-sm max-w-md">
            Log in to see your upcoming lessons, download materials your tutor shared,
            and keep track of your balance.
          </p>
        </div>

        <div className="text-indigo-200 text-xs">
          &copy; {new Date().getFullYear()} TutorHub
        </div>
      </div>

      {/* login form */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <h1 className="text-2xl font-semibold text-slate-900">TutorHub</h1>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
              >
                Log in
              </button>
            </form>
          </div>

          <p className="text-sm text-slate-500 text-center mt-4">
            Need help? Contact me: 050-000-0000{" "}
            (
            <a
              href="https://wa.me/972500000000"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              WhatsApp
            </a>
            )
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;