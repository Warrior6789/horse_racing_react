import client from './client'

export const getBalance = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user.role === 'Jockey') return client.get('/jockeyprofiles/my')
  } catch {}
  return client.get('/userprofiles/my')
}
export const deposit = (data) => client.post('/payments/deposit', data)
export const getTransactions = (params) => client.get('/payments/history/paged', { params })
export const getAllPayments = (params) => client.get('/payments/paged', { params })
export const cancelPayment = (orderCode) => client.get('/payments/cancel', { params: { orderCode } })
