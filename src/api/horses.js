import client from './client'

export const getHorses = (params) => client.get('/horses', { params })
export const getActiveHorses = () => client.get('/horses/active')
export const getActiveHorsesPaged = (params) => client.get('/horses/active/paged', { params })
export const getHorse = (id) => client.get(`/horses/${id}`)
export const createHorse = (formData) => client.post('/horses', formData)
export const updateHorse = (id, formData) => client.put(`/horses/${id}`, formData)
export const updateHorseImage = (id, formData) => client.put(`/horses/${id}/image`, formData)
export const deleteHorse = (id) => client.delete(`/horses/${id}`)
export const getMySchedule = () => client.get('/horses/my-schedule')
export const getHorseSchedule = (id) => client.get(`/horses/${id}/schedule`)
export const getHorseRewards = (id, params) => client.get(`/horses/${id}/rewards`, { params })
export const getHorsePerformance = (id) => client.get(`/horses/${id}/performance-summary`)
