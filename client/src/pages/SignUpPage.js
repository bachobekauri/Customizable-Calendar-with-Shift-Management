import React, { useState, useCallback } from "react";
import './SignUpPage.css';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "General"
  });
  const [passwordError, setPasswordError] = useState("");

  const departments = [
    "General",
    "Sales",
    "Marketing",
    "Development",
    "Support",
    "Management"
  ];

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleNavigateToLogin = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    
    if (!formData.name || !formData.email || !formData.password) {
      alert("Please fill in all required fields");
      return;
    }
    
    if (formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    // Register with employee role (users cannot choose admin/manager)
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: "employee", // Fixed role
      department: formData.department
    });

    if (result.success) {
      navigate("/main");
    }
  };
  
  return (
    <div className='container'>
      <div className='wrapper-left'>
        <div className='headline'>
          <p style={{ fontSize: "34px", letterSpacing: "3%", fontWeight: "500", textShadow: "0px 4px 4px rgba(0, 0, 0, 0.25)", color: "#030303" }}>
            CREATE ACCOUNT
          </p>
          <p style={{ color: "#636364" }}>
            Join us! Create your free employee account.
          </p>
          <p style={{ color: "#999", fontSize: "13px", marginTop: "15px" }}>
            ℹ️ Admin and Manager roles are assigned by system administrators only.
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

        {passwordError && (
          <div style={{ 
            color: '#EA454C', 
            backgroundColor: '#FFE6E7', 
            padding: '10px', 
            borderRadius: '8px',
            marginBottom: '20px',
            width: '310px'
          }}>
            {passwordError}
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
            <p>Confirm Password *</p>
            <input
              type="password"
              name="confirmPassword"
              placeholder="***********"
              value={formData.confirmPassword}
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
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <p style={{ fontSize: "12px", color: "#999", marginTop: "5px" }}>
              Select your department. You can change this later.
            </p>
          </div>

          {/* Display that role is automatically set to Employee */}
          <div style={{
            padding: "12px",
            backgroundColor: "#e3f2fd",
            borderRadius: "8px",
            marginBottom: "15px",
            borderLeft: "4px solid #1976d2"
          }}>
            <p style={{ margin: "0", fontSize: "13px", color: "#1976d2" }}>
              <strong>Account Type:</strong> Employee
            </p>
            <p style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}>
              You will be registered as an employee. Upgrade requests should be directed to your administrator.
            </p>
          </div>

          <button type="submit" className='signInButton' style={{ marginTop: '15px' }}>
            Create Employee Account
          </button>
        </form>

        <p className='signUpParagraph' style={{ marginTop: '15px' ,
          fontSize:'14px'
        }}>
          Already have an account?{" "}
          <button 
            type="button"
            style={{   color: "#EA454C", background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            onClick={handleNavigateToLogin}
          >
            Log in!
          </button>
        </p>

        {/* Additional Info Section */}
        <div style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          fontSize: "12px",
          color: "#666",
          lineHeight: "1.6"
        }}>
          
        </div>
      </div>

      <div className='wrapper-right'>
        <img src='/LoginImage.png' alt="Workplace illustration" />
      </div>
    </div>
  );
};

export default SignUpPage;