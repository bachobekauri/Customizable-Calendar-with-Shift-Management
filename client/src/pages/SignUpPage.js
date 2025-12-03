import React, { useState } from "react";
import './loginPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    department: "General"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    
    const result = await register(formData);
    if (result.success) {
      navigate("/main");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className='container'>
      <div className='wrapper-left'>
        <div className='headline'>
          <p style={{ fontSize: "34px", fontWeight: "500", color: "#030303" }}>
            CREATE ACCOUNT
          </p>
          <p style={{ color: "#636364" }}>Join us! Create your free account.</p>
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
            <p>Full Name *</p>
            <input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              className='inputField'
              required
            />
          </div>

          <div>
            <p>Email *</p>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className='inputField'
              required
            />
          </div>

          <div>
            <p>Password * (min. 6 characters)</p>
            <input
              type="password"
              name="password"
              placeholder="***********"
              value={formData.password}
              onChange={handleChange}
              className='inputField'
              required
              minLength="6"
            />
          </div>

          <div>
            <p>Department</p>
            <select
              name="department"
              className='inputField'
              style={{ height: "45px" }}
              value={formData.department}
              onChange={handleChange}
            >
              <option value="General">General</option>
              <option value="Sales">Sales</option>
              <option value="Marketing">Marketing</option>
              <option value="Development">Development</option>
              <option value="Support">Support</option>
              <option value="Management">Management</option>
            </select>
          </div>

          <div>
            <p>Role</p>
            <select
              name="role"
              className='inputField'
              style={{ height: "45px" }}
              value={formData.role}
              onChange={handleChange}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button type="submit" className='signInButton' style={{ marginTop: '15px' }}>
            Sign Up
          </button>
        </form>

        <p className='signUpParagraph' style={{ marginTop: '15px' }}>
          Already have an account?{" "}
          <button 
            style={{ color: "#EA454C", background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}
            onClick={() => navigate("/")}
          >
            Log in!
          </button>
        </p>
      </div>

      <div className='wrapper-right'>
        <img src='/LoginImage.png' alt="Workplace illustration" />
      </div>
    </div>
  );
};

export default SignUpPage;