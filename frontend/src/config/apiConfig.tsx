import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000, // 20 seconds timeout
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies for CORS requests
})

api.interceptors.response.use( response => response.data)
export default api;
