import client from './client'

// Admin endpoints
export const getRegistrationsPaged = (params) => client.get('/registrations/paged', { params })
export const adminAcceptRegistration = (id) => client.put(`/registrations/${id}/admin-accept`)
export const adminRejectRegistration = (id) => client.put(`/registrations/${id}/admin-reject`)
export const scratchRegistration = (id) => client.put(`/registrations/${id}/scratch`)

// Owner endpoints
export const getMyRegistrations      = ()       => client.get('/registrations/owner-requests')
export const getMyRegistrationsPaged = (params) => client.get('/registrations/owner-requests/paged', { params })
export const getOwnerAllRegistrations      = ()       => client.get('/registrations/owner')
export const getOwnerAllRegistrationsPaged = (params) => client.get('/registrations/owner/paged', { params })

// Jockey endpoints
export const getJockeyMyRequests      = ()       => client.get('/registrations/my-requests')
export const getJockeyMyRequestsPaged = (params) => client.get('/registrations/my-requests/paged', { params })
export const acceptRegistration       = (id)     => client.put(`/registrations/${id}/accept`)
export const rejectRegistration       = (id)     => client.put(`/registrations/${id}/reject`)

// Shared endpoints
export const getRegistrations = (params) => client.get('/registrations', { params })
export const getRegistration = (id) => client.get(`/registrations/${id}`)
export const getJockeys = (params) => client.get('/jockeyprofiles', { params })
