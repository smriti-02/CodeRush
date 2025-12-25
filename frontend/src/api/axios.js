import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true // Required for cookie-based auth
});

export default api;