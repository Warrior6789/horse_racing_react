import client from './client'

export const placeBet = (data) => client.post('/bets', data)
export const getMyBets = () => client.get('/bets/my')
export const getMyBetsPaged = (params) => client.get('/bets/my/paged', { params })
