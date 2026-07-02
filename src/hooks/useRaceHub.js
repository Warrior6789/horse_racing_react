import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'

export function useRaceHub(raceId, { onPoolUpdate, onPrizePoolUpdate, onRaceUpdate, onRacesUpdated, onPaymentsUpdated, onWithdrawalsUpdated, onUpgradeRequestsUpdated, onRegistrationsUpdated, onBalanceUpdated, onReportUpdated } = {}) {
  const hubRef    = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {

    let cancelled = false

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL ?? ''}/racehub`, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
        accessTokenFactory: () => localStorage.getItem('token') || '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build()

    hub.on('PoolUpdate', (data) => {
      if (data.raceId === raceId) onPoolUpdate?.(data.pools)
    })

    hub.on('PrizePoolUpdate', (data) => {
      if (data.raceId === raceId) onPrizePoolUpdate?.(data.prizePool)
    })

    hub.on('RaceUpdate', (data) => {
      if (!raceId || data.raceId === raceId) onRaceUpdate?.(data)
    })

    hub.on('RacesUpdated', () => {
      onRacesUpdated?.()
    })

    hub.on('PaymentsUpdated', (data) => {
      onPaymentsUpdated?.(data)
    })

    hub.on('WithdrawalsUpdated', (data) => {
      onWithdrawalsUpdated?.(data)
    })

    hub.on('UpgradeRequestsUpdated', (data) => {
      onUpgradeRequestsUpdated?.(data)
    })

    hub.on('RegistrationsUpdated', (data) => {
      onRegistrationsUpdated?.(data)
    })

    hub.on('BalanceUpdated', (data) => {
      onBalanceUpdated?.(data)
    })

    hub.on('ReportUpdated', (data) => {
      onReportUpdated?.(data)
    })

    hub.start()
      .then(() => {
        if (cancelled) { hub.stop(); return }
        setConnected(true)
        if (raceId) hub.invoke('JoinRace', raceId).catch(() => {})
        hubRef.current = hub
      })
      .catch(() => {})

    return () => {
      cancelled = true
      setConnected(false)
      const h = hubRef.current
      if (h) {
        if (raceId) h.invoke('LeaveRace', raceId).catch(() => {})
        h.stop()
        hubRef.current = null
      } else {
        hub.stop()
      }
    }
  }, [raceId])

  return connected
}
