import client from './client'

export const getWalletTransactionsPaged = (params) => client.get('/WalletTransactions', { params })
export const getBalanceReconciliation = () => client.get('/WalletTransactions/reconciliation')
export const getMyWalletTransactions = (params) => client.get('/WalletTransactions/my', { params })
