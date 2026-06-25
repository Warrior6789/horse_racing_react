import client from './client'

export const login = (data) => client.post('/auth/login', data)
export const register = (formData) => client.post('/auth/register', formData)
export const upgrade = (formData) => client.post('/auth/upgrade', formData)
export const logout = () => client.post('/auth/logout')
export const getMe = () => client.get('/auth/me')

// Decode JWT payload to extract user info (no library needed)
export function parseJwt(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )
    const claims = JSON.parse(json)
    const rawRole = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || claims.role || ''
    return {
      id:       claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || claims.sub || claims.nameid,
      email:    claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']   || claims.email,
      role:     rawRole === 'HorseOwner' ? 'Owner' : rawRole,
      fullName: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']            || claims.unique_name || claims.name,
    }
  } catch {
    return {}
  }
}
