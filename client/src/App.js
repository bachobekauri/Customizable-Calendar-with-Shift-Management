import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/loginPage";
import SignUpPage from "./pages/SignUpPage";
import MainPage from "./pages/mainPage";
import EmployeesPage from "./pages/EmployeesPage";
import RequestsPage from "./pages/RequestsPage";
import ReportsPage from "./pages/reportsPage";
import EmployeeEditPage from "./pages/EmployeeEditPage";
import EmployeeSchedulePage from "./pages/EmployeeSchedulePage";
import RequestSchedulePage from './pages/RequestSchedulePage';
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/request-schedule" element={<RequestSchedulePage />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route 
            path="/main" 
            element={
              <ProtectedRoute>
                <MainPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees" 
            element={
              <ProtectedRoute roles={['manager', 'admin']}>
                <EmployeesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employees/:id/edit" 
            element={
              <ProtectedRoute roles={['admin']}>
                <EmployeeEditPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee-schedule/:id" 
            element={
              <ProtectedRoute roles={['manager', 'admin', 'employee']}>
                <EmployeeSchedulePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/requests" 
            element={
              <ProtectedRoute roles={['manager', 'admin']}>
                <RequestsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute roles={['manager', 'admin']}>
                <ReportsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute roles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" />} />
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;