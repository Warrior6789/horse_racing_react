import client from './client'

export const getWithdrawalsPaged = (params) => client.get('/withdrawals/pending', { params })
export const requestWithdrawal = (data) => client.post('/withdrawals', data)
export const approveWithdrawal = (id, dto = {}) => client.put(`/withdrawals/${id}/approve`, dto)
export const rejectWithdrawal = (id, dto = {}) => client.put(`/withdrawals/${id}/reject`, dto)
