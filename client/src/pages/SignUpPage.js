import React, { useState } from "react";
import './loginPage.css'; // reuse same styling or create signupPage.css
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = () => {
    if (!role) {
      alert("Please select a role!");
      return;
    }
    console.log({ email, password, role });
    navigate("/"); // After signup go back to login or dashboard
  };

  return (
    <div className="container">
      <div className="wrapper-left">
        <div className="headline">
          <p style={{ fontSize: "34px", fontWeight: "500", color: "#030303" }}>
            CREATE ACCOUNT
          </p>
          <p style={{ color: "#636364" }}>Join us! Create your free account.</p>
        </div>

        <div>
          <p>Email</p>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="inputField"
          />
        </div>

        <div>
          <p>Password</p>
          <input
            type="password"
            placeholder="***********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="inputField"
          />
        </div>

        <div>
          <p>Select Role</p>
          <select
            className="inputField"
            style={{ height: "45px" }}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Choose role</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button className="signInButton" onClick={handleSignUp}>
          Sign Up
        </button>

        <p className="signUpParagraph">
          Already have an account?{" "}
          <button style={{ color: "#EA454C" }} onClick={() => navigate("/")}>
            Log in!
          </button>
        </p>
      </div>

      <div className="wrapper-right">
        <img src="/LoginImage.png" alt="" />
      </div>
    </div>
  );
};

export default SignUpPage;
