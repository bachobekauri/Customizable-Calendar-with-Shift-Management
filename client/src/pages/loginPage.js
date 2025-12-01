import './loginPage.css';
import React, { useState } from 'react';
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState('');

  return (
    <div className='container'>
      <div className='wrapper-left'>
        <div className='headline'>
          <p style={{ fontSize: "34px", letterSpacing: "3%", fontWeight: "500", textShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)", color: "#030303" }}>
            WELCOME BACK
          </p>
          <p style={{ color: "#636364" }}>
            Welcome back! Please enter your details.
          </p>
        </div>

        <div>
          <p>Email</p>
          <input type='email' value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email" className='inputField'></input>
        </div>

        <div>
          <p>Password</p>
          <input type='password' value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="***********" className='inputField'></input>
        </div>
        <div className='radioField'>
          <div style={{ display: "flex" }}>
            <input type='checkbox' value={rememberMe} onChange={(e) => setRememberMe(e.target.value)}>
            </input>
            <p>Remember me</p>
          </div>
          <button>Forgot Password</button>
        </div>
        <button className='signInButton'>Sign in</button>
        <p className='signUpParagraph'>
          Don’t have an account? <button style={{ color: "#EA454C" }}>Sign up fo free!</button>
        </p>
      </div>

      <div className='wrapper-right'>
        <img src='/LoginImage.png'></img>
      </div>
    </div>
  );
}

export default LoginPage;
