import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/login';
import Register from './pages/Register';
import Dashboard from './pages/dashboard';
import Arena from './pages/Arena'; // <-- Import this
import CodeRushHero from './pages/CodeRushHero'; // <-- Import this

function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<CodeRushHero />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/CodeRushHero" element={<CodeRushHero />} /> {/* <-- Add this route */}
        <Route path="/arena/:gameId" element={<Arena />} /> {/* <-- Add this route */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;