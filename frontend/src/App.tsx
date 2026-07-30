import { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    console.log("email is ",{email});
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPassword(e.target.value);
    console.log("password is ", {password}, "understood?\ngreat!");
  }

  async function handleLogin() {
    const response = await fetch("http://localhost:8080/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }), // use what the user actually typed
    });

    const data = await response.json();
    console.log(data);
  }

  return (
    <div>
      <h1>Hello There!</h1>
      <p>Please type here your email</p>
      <input value = {email} onChange={handleEmailChange} />
      <p>Now please type your password</p>
      <input type="password" value = {password} onChange={handlePasswordChange} />
      <br/>
      <button onClick={handleLogin}>Log in</button>
    </div>

  )
}

export default App;