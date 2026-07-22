import api from './api';

export const register = (payload) => api.post('/auth/register', payload).then((r) => r.data);
export const login = (payload) => api.post('/auth/login', payload).then((r) => r.data);
export const logout = (refreshToken) => api.post('/auth/logout', { refreshToken }).then((r) => r.data);
