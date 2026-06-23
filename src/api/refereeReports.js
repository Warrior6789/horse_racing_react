import client from './client'

export const createReport = (data) => client.post('/refereereports', data)
export const getReports = (params) => client.get('/refereereports', { params })
export const approveReport = (id) => client.put(`/refereereports/${id}/approve`)
export const rejectReport = (id) => client.put(`/refereereports/${id}/reject`)
