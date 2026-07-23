import client from './client'

export const getDashboardFinancial = (params) => client.get('/dashboard/financial', { params })
export const getRaceStatusBreakdown = () => client.get('/dashboard/races-by-status')
export const getBetTypeBreakdown = () => client.get('/dashboard/bets-by-type')
