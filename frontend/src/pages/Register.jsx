import { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/users/register', formData);
            toast.success(response.data.message);
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration failed");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" onChange={(e) => setFormData({...formData, username: e.target.value})} required />
            <input type="email" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} required />
            <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} required />
            <button type="submit">Register</button>
        </form>
    );
};

export default Register;