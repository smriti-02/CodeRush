import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard';
import Arena from './pages/Arena';
import CodeRushHero from './pages/CodeRushHero';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<CodeRushHero />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/CodeRushHero" element={<CodeRushHero />} />
        <Route path="/arena/:gameId" element={<Arena />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;