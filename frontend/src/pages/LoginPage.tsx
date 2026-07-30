
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const API_BASE_URL = "http://localhost:8080";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    setErrorMessage("");
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errorData = await response.json();
      setErrorMessage(errorData.message);
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
    <div>
      <h1>Hello! Please Log in</h1>
      <p>Your email is: </p>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <p>Your password is: </p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /> 
      <br />
      <button onClick={handleLogin}>Log in</button>
      <p>{errorMessage}</p>
    </div>
  );
}

export default LoginPage;