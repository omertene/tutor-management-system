import { useState } from "react";

// backend address, defined once so every fetch call builds off of it
const API_BASE_URL = "http://localhost:8080";

// shape of what /auth/login returns, matches the backend's LoginResponse exactly
type LoginResponse = {
  token: string;
  userId: number;
  email: string;
  role: string;
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // who is currently logged in - null means nobody is logged in yet,
  // so this is what decides which screen gets shown below
  const [currentUser, setCurrentUser] = useState<LoginResponse | null>(null);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
  }

  async function handleLogin() {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // backend sent a clean error body, e.g. { message: "Invalid email or password" }
      setErrorMessage(data.message);
      return;
    }

    // success: data is now a real LoginResponse
    localStorage.setItem("token", data.token);
    setCurrentUser(data);
    setErrorMessage("");
  }

  // nobody logged in yet -> show the login form
  if (currentUser === null) {
    return (
      <div>
        <h1>Hello There!</h1>
        <p>Please type here your email</p>
        <input value={email} onChange={handleEmailChange} />
        <p>Now please type your password</p>
        <input type="password" value={password} onChange={handlePasswordChange} />
        <br />
        <button onClick={handleLogin}>Log in</button>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      </div>
    );
  }

  // logged in as teacher -> generic teacher screen
  if (currentUser.role === "TEACHER") {
    return <h1>Welcome, Teacher {currentUser.email}</h1>;
  }

  // logged in as student -> generic student screen
  return <h1>Welcome, Student {currentUser.email}</h1>;
}

export default App;
