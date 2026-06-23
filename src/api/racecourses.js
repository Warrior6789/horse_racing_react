import client from './client'

export const getRacecourses = () => client.get('/racecourses')
export const getRacecoursesPaged = (params) => client.get('/racecourses/paged', { params })
export const getRacecourse = (id) => client.get(`/racecourses/${id}`)
export const createRacecourse = (formData) => client.post('/racecourses', formData)
export const updateRacecourse = (id, data) => client.put(`/racecourses/${id}`, data)
export const uploadRacecourseImage = (id, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.put(`/racecourses/${id}/image`, fd)
}
export const deleteRacecourse = (id) => client.delete(`/racecourses/${id}`)
