import client from './client'

export const getMyProfile = () => client.get('/userprofiles/my')
export const updateProfile = (id, data) => client.put(`/userprofiles/${id}`, data)
export const updateProfileImage = (formData) => client.put('/userprofiles/image', formData)
