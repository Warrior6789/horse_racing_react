import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PrivateRoute from './components/PrivateRoute'

import HomePage from './pages/HomePage'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import RoleUpgrade from './pages/auth/RoleUpgrade'
import PaymentCancel from './pages/payment/Cancel'

import SpectatorDashboard from './pages/spectator/Dashboard'
import UpcomingRaces from './pages/spectator/UpcomingRaces'
import LiveRace from './pages/spectator/LiveRace'
import MyBets from './pages/spectator/MyBets'
import Wallet from './pages/spectator/Wallet'
import RaceResult from './pages/RaceResult'

import OwnerLayout from './components/OwnerLayout'
import JockeyLayout from './components/JockeyLayout'
import DashboardLayout from './components/DashboardLayout'

import OwnerDashboard from './pages/owner/Dashboard'
import MyHorses from './pages/owner/MyHorses'
import MySchedule from './pages/owner/MySchedule'
import OwnerWallet from './pages/owner/Wallet'
import OwnerEarnings from './pages/owner/Earnings'
import HorseForm from './pages/owner/HorseForm'
import AvailableRaces from './pages/owner/AvailableRaces'
import RaceRegistration from './pages/owner/RaceRegistration'

import JockeyDashboard from './pages/jockey/Dashboard'
import JockeyRequests from './pages/jockey/MyRequests'
import JockeyWallet from './pages/jockey/Wallet'
import JockeySchedule from './pages/jockey/Schedule'

import RefereeRaces from './pages/referee/Races'
import RefereeRaceDetail from './pages/referee/RaceDetail'

import AdminDashboard from './pages/admin/Dashboard'
import AccountManagement from './pages/admin/AccountManagement'
import RaceManagement from './pages/admin/RaceManagement'
import RacecourseManagement from './pages/admin/RacecourseManagement'
import RegistrationManagement from './pages/admin/RegistrationManagement'
import AdminRefereeReports from './pages/admin/AdminRefereeReports'
import WithdrawalManagement from './pages/admin/WithdrawalManagement'
import ConfigManagement from './pages/admin/ConfigManagement'
import PaymentManagement from './pages/admin/PaymentManagement'
import RefereeAssignment from './pages/admin/RefereeAssignment'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<HomePage />} />

          {/* Upgrade (any authenticated user) */}
          <Route path="/upgrade" element={<PrivateRoute><RoleUpgrade /></PrivateRoute>} />

          {/* Payment return pages */}
          <Route path="/payment/cancel" element={<PrivateRoute><PaymentCancel /></PrivateRoute>} />

          {/* Spectator */}
          <Route path="/spectator/dashboard" element={<PrivateRoute><SpectatorDashboard /></PrivateRoute>} />
          <Route path="/spectator/races" element={<PrivateRoute><UpcomingRaces /></PrivateRoute>} />
          <Route path="/spectator/races/:raceId/live"    element={<PrivateRoute><LiveRace /></PrivateRoute>} />
          <Route path="/spectator/races/:raceId/results" element={<PrivateRoute><RaceResult backUrl="/spectator/races" /></PrivateRoute>} />
          <Route path="/spectator/bets" element={<PrivateRoute><MyBets /></PrivateRoute>} />
          <Route path="/spectator/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />

          {/* Owner */}
          <Route path="/owner/dashboard" element={<PrivateRoute roles={['Owner', 'Admin']}><OwnerDashboard /></PrivateRoute>} />
          <Route path="/owner/horses" element={<PrivateRoute roles={['Owner', 'Admin']}><MyHorses /></PrivateRoute>} />
          <Route path="/owner/horses/new" element={<PrivateRoute roles={['Owner', 'Admin']}><HorseForm /></PrivateRoute>} />
          <Route path="/owner/horses/:id/edit" element={<PrivateRoute roles={['Owner', 'Admin']}><HorseForm /></PrivateRoute>} />
          <Route path="/owner/schedule" element={<PrivateRoute roles={['Owner', 'Admin']}><MySchedule /></PrivateRoute>} />
          <Route path="/owner/races"                   element={<PrivateRoute roles={['Owner', 'Admin']}><AvailableRaces /></PrivateRoute>} />
          <Route path="/owner/races/:raceId/register" element={<PrivateRoute roles={['Owner', 'Admin']}><RaceRegistration /></PrivateRoute>} />
          <Route path="/owner/races/:raceId/live"     element={<PrivateRoute roles={['Owner', 'Admin']}><LiveRace Layout={OwnerLayout} backUrl="/owner/dashboard" /></PrivateRoute>} />
          <Route path="/owner/races/:raceId/results"  element={<PrivateRoute roles={['Owner', 'Admin']}><RaceResult Layout={OwnerLayout} backUrl="/owner/schedule" /></PrivateRoute>} />
          <Route path="/owner/earnings" element={<PrivateRoute roles={['Owner', 'Admin']}><OwnerEarnings /></PrivateRoute>} />
          <Route path="/owner/wallet" element={<PrivateRoute roles={['Owner', 'Admin']}><OwnerWallet /></PrivateRoute>} />

          {/* Jockey */}
          <Route path="/jockey/dashboard" element={<PrivateRoute roles={['Jockey', 'Admin']}><JockeyDashboard /></PrivateRoute>} />
          <Route path="/jockey/requests"  element={<PrivateRoute roles={['Jockey', 'Admin']}><JockeyRequests /></PrivateRoute>} />
          <Route path="/jockey/wallet"    element={<PrivateRoute roles={['Jockey', 'Admin']}><JockeyWallet /></PrivateRoute>} />
          <Route path="/jockey/schedule"  element={<PrivateRoute roles={['Jockey', 'Admin']}><JockeySchedule /></PrivateRoute>} />
          <Route path="/jockey/races/:raceId/live"    element={<PrivateRoute roles={['Jockey', 'Admin']}><LiveRace Layout={JockeyLayout} backUrl="/jockey/dashboard" /></PrivateRoute>} />
          <Route path="/jockey/races/:raceId/results" element={<PrivateRoute roles={['Jockey', 'Admin']}><RaceResult Layout={JockeyLayout} backUrl="/jockey/schedule" /></PrivateRoute>} />

          {/* Referee */}
          <Route path="/referee/races"                     element={<PrivateRoute roles={['Referee', 'Admin']}><RefereeRaces /></PrivateRoute>} />
          <Route path="/referee/races/:raceId"             element={<PrivateRoute roles={['Referee', 'Admin']}><RefereeRaceDetail /></PrivateRoute>} />
          <Route path="/referee/races/:raceId/live"        element={<PrivateRoute roles={['Referee', 'Admin']}><LiveRace Layout={DashboardLayout} backUrl="/referee/races" /></PrivateRoute>} />
          <Route path="/referee/races/:raceId/results"     element={<PrivateRoute roles={['Referee', 'Admin']}><RaceResult Layout={DashboardLayout} backUrl="/referee/races" /></PrivateRoute>} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={<PrivateRoute roles={['Admin']}><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/accounts" element={<PrivateRoute roles={['Admin']}><AccountManagement /></PrivateRoute>} />
          <Route path="/admin/races" element={<PrivateRoute roles={['Admin']}><RaceManagement /></PrivateRoute>} />
          <Route path="/admin/racecourses" element={<PrivateRoute roles={['Admin']}><RacecourseManagement /></PrivateRoute>} />
          <Route path="/admin/registrations" element={<PrivateRoute roles={['Admin']}><RegistrationManagement /></PrivateRoute>} />
          <Route path="/admin/referee-reports" element={<PrivateRoute roles={['Admin']}><AdminRefereeReports /></PrivateRoute>} />
          <Route path="/admin/withdrawals" element={<PrivateRoute roles={['Admin']}><WithdrawalManagement /></PrivateRoute>} />
          <Route path="/admin/config" element={<PrivateRoute roles={['Admin']}><ConfigManagement /></PrivateRoute>} />
          <Route path="/admin/payments" element={<PrivateRoute roles={['Admin']}><PaymentManagement /></PrivateRoute>} />
          <Route path="/admin/referees" element={<PrivateRoute roles={['Admin']}><RefereeAssignment /></PrivateRoute>} />

          <Route path="/unauthorized" element={<div className="flex items-center justify-center h-screen text-secondary text-body-lg">You do not have permission to access this page.</div>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
