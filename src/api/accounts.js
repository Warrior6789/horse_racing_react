import client from './client'

export const getAccountsPaged = (params) => client.get('/accounts/paged', { params })
export const suspendAccount = (id) => client.put(`/accounts/${id}/suspend`)
export const restoreAccount = (id) => client.put(`/accounts/${id}/restore`)
export const getUpgradeRequests = (params) => client.get('/accounts/upgrades/paged', { params })
export const getUpgradeDetail = (id) => client.get(`/accounts/${id}/upgrade-detail`)
export const approveUpgrade = (id) => client.put(`/accounts/${id}/approve-upgrade`)
export const rejectUpgrade = (id) => client.put(`/accounts/${id}/reject-upgrade`)
