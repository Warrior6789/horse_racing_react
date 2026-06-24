import client from './client'

export const getRacesPaged = (params) => client.get('/races/paged', { params })
export const getRace = (id) => client.get(`/races/${id}`)
export const getUpcomingRaces = (params) => client.get('/races/upcoming/paged', { params })
export const getRacesByTournament = (tournamentId) => client.get(`/races/tournament/${tournamentId}`)
export const getRaceHorses = (raceId) => client.get(`/races/${raceId}/horses`)
export const getRaceResults = (raceId) => client.get(`/races/${raceId}/results`)
export const createRace = (formData) => client.post('/races', formData)
export const updateRace = (id, data) => client.put(`/races/${id}`, data)
export const uploadRaceImage = (id, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return client.put(`/races/${id}/image`, fd)
}
export const resetRace = (id) => client.post(`/races/${id}/reset`)
export const advanceRace = (id) => client.post(`/races/${id}/advance`)
export const overrideResult = (raceId, results) => client.post(`/races/${raceId}/engine/override-result`, results)
export const deleteRace = (id) => client.delete(`/races/${id}`)
export const registerHorseToRace = (raceId, data) => client.post(`/races/${raceId}/register`, data)
export const getRaceRegistrations = (raceId) => client.get(`/races/${raceId}/registrations`)
