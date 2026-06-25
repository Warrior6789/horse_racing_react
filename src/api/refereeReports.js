import client from './client'

export const createReport    = (data)   => client.post('/referee-reports', data)
export const getReports      = (params) => client.get('/referee-reports', { params })
export const getMyReports    = (params) => client.get('/referee-reports/my/paged', { params })
export const getReportById   = (id)     => client.get(`/referee-reports/${id}`)
export const updateReport    = (id, data) => client.put(`/referee-reports/${id}`, data)
export const approveReport   = (id)     => client.put(`/referee-reports/${id}/approve`)
export const rejectReport    = (id)     => client.put(`/referee-reports/${id}/reject`)
