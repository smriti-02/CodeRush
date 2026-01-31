import React, { useState } from 'react';
import axios from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Updated to hit your custom backend login endpoint
            const response = await axios.post("/users/login", formData);
            
            if (response.data.success) {
                toast.success("Welcome back!");
                navigate("/dashboard");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
        }
    };

    // Helper functions to trigger Passport.js OAuth flows
    const continueWithGoogle = () => {
        window.open("http://localhost:8000/api/v1/users/auth/google", "_self");
    };

    const continueWithGithub = () => {
        window.open("http://localhost:8000/api/v1/users/auth/github", "_self");
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleLogin}>
                <h2>Login to CodeRush</h2>
                <input 
                    name="email" 
                    type="email" 
                    placeholder="Email" 
                    onChange={handleChange} 
                    required 
                />
                <input 
                    name="password" 
                    type="password" 
                    placeholder="Password" 
                    onChange={handleChange} 
                    required 
                />
                <button type="submit">Login</button>
            </form>

            <div className="social-auth">
                <button onClick={continueWithGoogle} className="google-btn">
                    Continue with Google
                </button>
                <button onClick={continueWithGithub} className="github-btn">
                    Continue with GitHub
                </button>
            </div>

            <p>New here? <Link to="/register">Register</Link></p>
        </div>
    );
};

export default Login;