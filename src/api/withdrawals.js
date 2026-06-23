import client from './client'

export const getWithdrawals = (params) => client.get('/withdrawals', { params })
export const getWithdrawalsPaged = (params) => client.get('/withdrawals/pending', { params })
export const getMyWithdrawals = (params) => client.get('/withdrawals/my-history', { params })
export const requestWithdrawal = (data) => client.post('/withdrawals', data)
export const approveWithdrawal = (id, dto = {}) => client.put(`/withdrawals/${id}/approve`, dto)
export const rejectWithdrawal = (id, dto = {}) => client.put(`/withdrawals/${id}/reject`, dto)
