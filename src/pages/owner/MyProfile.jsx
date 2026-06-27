import OwnerLayout from '../../components/OwnerLayout'
import UserProfilePage from '../../components/UserProfilePage'

export default function OwnerMyProfile() {
  return (
    <UserProfilePage
      Layout={OwnerLayout}
      roleName="Owner"
      badgeColor="bg-blue-500/20 border-blue-400 text-blue-300"
    />
  )
}
