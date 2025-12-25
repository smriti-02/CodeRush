import { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/users/login', formData);
            toast.success("Logged in successfully!");
            // Store user data in state or local storage if needed
            console.log(response.data.data); 
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;