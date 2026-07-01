import client from './client'

export const getMyJockeyProfile = () => client.get('/jockeyprofiles/my')
export const getJockeyProfile = (id) => client.get(`/jockeyprofiles/${id}`)
export const getJockeysPaged = (params) => client.get('/jockeyprofiles/paged', { params })
export const updateJockeyProfile = (id, data) => client.put(`/jockeyprofiles/${id}`, data)
export const updateJockeyImage = (formData) => client.put('/jockeyprofiles/image', formData)
export const getMyJockeyRewards     = (params) => client.get('/jockeyprofiles/my/rewards', { params })
export const getMyJockeyRaceHistory = (params) => client.get('/jockeyprofiles/my/race-history', { params })
