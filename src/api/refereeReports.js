import client from './client'

export const createReport    = (data)   => client.post('/refereereports', data)
export const getReports      = (params) => client.get('/refereereports', { params })
export const getMyReports    = (params) => client.get('/refereereports/my/paged', { params })
export const getReportById   = (id)     => client.get(`/refereereports/${id}`)
export const updateReport    = (id, data) => client.put(`/refereereports/${id}`, data)
export const approveReport   = (id)     => client.put(`/refereereports/${id}/approve`)
export const rejectReport    = (id)     => client.put(`/refereereports/${id}/reject`)
