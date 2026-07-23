import client from './client'

export const getDashboardSummary = (params) => client.get('/dashboard/summary', { params })
