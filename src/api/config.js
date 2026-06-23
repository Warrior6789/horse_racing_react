import client from './client'

// PositionPrizeConfig — GET /paged, GET /active, POST, PUT /{id}/activate
export const getPositionPrizeConfigs = (params) => client.get('/positionprizeconfig/paged', { params })
export const getActivePositionPrizeConfig = () => client.get('/positionprizeconfig/active')
export const createPositionPrizeConfig = (data) => client.post('/positionprizeconfig', data)
export const activatePositionPrizeConfig = (id) => client.put(`/positionprizeconfig/${id}/activate`)

// JockeyRewardConfig — GET /paged, GET /active, POST, PUT /{id}/activate
export const getJockeyRewardConfigs = (params) => client.get('/jockeyrewardconfig/paged', { params })
export const getActiveJockeyRewardConfig = () => client.get('/jockeyrewardconfig/active')
export const createJockeyRewardConfig = (data) => client.post('/jockeyrewardconfig', data)
export const activateJockeyRewardConfig = (id) => client.put(`/jockeyrewardconfig/${id}/activate`)

// TakeoutConfig — GET /page, GET /active, POST, PUT /{id}/activate
export const getTakeoutConfigs = (params) => client.get('/takeoutconfig/page', { params })
export const getActiveTakeoutConfig = () => client.get('/takeoutconfig/active')
export const createTakeoutConfig = (data) => client.post('/takeoutconfig', data)
export const activateTakeoutConfig = (id) => client.put(`/takeoutconfig/${id}/activate`)

// RegistrationFeeConfig — GET /page, GET /active, POST, PUT /{id}/activate
export const getRegistrationFeeConfigs    = (params) => client.get('/registrationfeeconfig/page', { params })
export const getActiveRegistrationFeeConfig = ()     => client.get('/registrationfeeconfig/active')
export const createRegistrationFeeConfig  = (data)  => client.post('/registrationfeeconfig', data)
export const activateRegistrationFeeConfig = (id)   => client.put(`/registrationfeeconfig/${id}/activate`)

// ConversionRate — GET /page, GET /active, POST, PUT /{id}/activate
export const getConversionRates = (params) => client.get('/conversionrate/page', { params })
export const getActiveConversionRate = () => client.get('/conversionrate/active')
export const createConversionRate = (data) => client.post('/conversionrate', data)
export const activateConversionRate = (id) => client.put(`/conversionrate/${id}/activate`)
