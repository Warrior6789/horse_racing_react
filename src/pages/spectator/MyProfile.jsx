import SpectatorLayout from '../../components/SpectatorLayout'
import UserProfilePage from '../../components/UserProfilePage'

export default function SpectatorMyProfile() {
  return (
    <UserProfilePage
      Layout={SpectatorLayout}
      roleName="Spectator"
      badgeColor="bg-gray-500/20 border-gray-400 text-gray-300"
    />
  )
}
