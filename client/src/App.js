import React, { useState } from 'react';
import LoginPage from './pages/loginPage';
import MainPage from './pages/mainPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div>
      <LoginPage/>
    </div>
  );
}

export default App;
