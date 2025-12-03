import './loginPage.css';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      navigate('/main');
    }
  };

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

        {error && (
          <div style={{ 
            color: '#EA454C', 
            backgroundColor: '#FFE6E7', 
            padding: '10px', 
            borderRadius: '8px',
            marginBottom: '20px',
            width: '310px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <p>Email</p>
            <input 
              type='email' 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email" 
              className='inputField'
              required
            />
          </div>

          <div>
            <p>Password</p>
            <input 
              type='password' 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="***********" 
              className='inputField'
              required
            />
          </div>
          
          <div className='radioField'>
            <div style={{ display: "flex" }}>
              <input 
                type='checkbox' 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <p>Remember me</p>
            </div>
            <button type="button" style={{ background: 'none', border: 'none', color: '#EA454C', cursor: 'pointer' }}>
              Forgot Password
            </button>
          </div>
          
          <button type="submit" className='signInButton'>
            Sign in
          </button>
        </form>

        <p className='signUpParagraph'>
          Don't have an account? 
          <button
            style={{ color: "#EA454C", background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => navigate('/signup')}
          >
            Sign up for free!
          </button>
        </p>
      </div>

      <div className='wrapper-right'>
        <img src='/LoginImage.png' alt="Workplace illustration" />
      </div>
    </div>
  );
}

export default LoginPage;