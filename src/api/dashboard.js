import client from './client'

export const getDashboardFinancial = (params) => client.get('/dashboard/financial', { params })
