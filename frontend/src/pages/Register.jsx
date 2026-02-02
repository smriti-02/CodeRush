import React, { useState } from 'react';
import axios from '../api/axios';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("/users/register", formData);
            
            if (response.data.success) {
                toast.success("Account created successfully! Please login.");
                navigate("/login");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed");
        }
    };

    // Helper functions to trigger the same Passport.js flows used in login
    const continueWithGoogle = () => {
        window.location.href = "http://localhost:8000/api/v1/users/auth/google";
    };

    const continueWithGithub = () => {
        window.location.href = "http://localhost:8000/api/v1/users/auth/github";
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleRegister}>
                <h2>Create Account</h2>
                <input 
                    name="username" 
                    placeholder="Username" 
                    onChange={handleChange} 
                    required 
                />
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
                <button type="submit">Register with Email</button>
            </form>

            {/* Added Social Registration Buttons */}
            <div className="social-auth">
                <hr />
                <p>Or sign up using</p>
                <button onClick={continueWithGoogle} className="google-btn">
                    Sign up with Google
                </button>
                <button onClick={continueWithGithub} className="github-btn">
                    Sign up with GitHub
                </button>
            </div>

            <p>Already have an account? <Link to="/login">Login</Link></p>
        </div>
    );
};

export default Register;