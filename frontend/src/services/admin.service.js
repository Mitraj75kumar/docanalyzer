import api from './api';

export const getPlatformStats = () => api.get('/admin/stats').then((r) => r.data);
export const listUsers = (params) => api.get('/admin/users', { params }).then((r) => r.data);
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role }).then((r) => r.data);
export const toggleUserStatus = (id, isActive) =>
  api.put(`/admin/users/${id}/status`, { isActive }).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data);
export const listAllDocuments = (params) => api.get('/admin/documents', { params }).then((r) => r.data);
