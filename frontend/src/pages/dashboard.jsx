import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Calls the profile route defined in your user.routes.js
                const response = await axios.get('/users/profile');
                setUser(response.data.data);
            } catch (error) {
                console.error("Failed to fetch profile", error);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await axios.post('/users/logout');
            toast.success("Logged out successfully");
            navigate('/login');
        } catch (error) {
            toast.error("Logout failed");
        }
    };

    if (loading) return <div className="dashboard-container">Loading...</div>;

    return (
        <div className="dashboard-wrapper">
            <div className="dashboard-card">
                <h1>Welcome, {user?.username}!</h1>
                <div className="user-info">
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>ELO Rating:</strong> {user?.elo || 0}</p>
                    <p><strong>Problems Solved:</strong> {user?.problemsSolved || 0}</p>
                </div>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;