import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, Loader } from 'lucide-react'
import { cancelPayment } from '../../api/payments'
import { useAuth } from '../../context/AuthContext'

const WALLET_PATH = {
  Spectator: '/spectator/wallet',
  Owner:     '/owner/wallet',
  Jockey:    '/jockey/wallet',
}

export default function PaymentCancel() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const orderCode  = searchParams.get('orderCode')
  const walletPath = WALLET_PATH[user?.role] || '/spectator/wallet'

  const [status, setStatus] = useState('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!orderCode) {
      setErrMsg('Không tìm thấy mã đơn hàng.')
      setStatus('error')
      return
    }
    cancelPayment(orderCode)
      .then(() => setStatus('success'))
      .catch(e => {
        setErrMsg(e.response?.data?.message || 'Không thể hủy giao dịch.')
        setStatus('error')
      })
  }, [orderCode])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#110e0b]">
      <div className="bg-[#171410] border border-stone-800 rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">

        {status === 'loading' && (
          <>
            <Loader size={48} className="text-stone-500 animate-spin mx-auto mb-4" />
            <p className="text-stone-300 font-semibold">Đang hủy giao dịch...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-stone-100 mb-2">Đã hủy giao dịch</h2>
            <p className="text-stone-400 text-sm mb-6">
              Giao dịch <span className="text-stone-200 font-semibold">#{orderCode}</span> đã được hủy thành công.
            </p>
            <button
              onClick={() => navigate(walletPath)}
              className="w-full bg-[#f7e0a3] text-[#110e0b] font-bold py-3 rounded-xl text-sm hover:bg-[#ebd292] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Quay về ví
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-black text-stone-100 mb-2">Có lỗi xảy ra</h2>
            <p className="text-stone-400 text-sm mb-6">{errMsg}</p>
            <button
              onClick={() => navigate(walletPath)}
              className="w-full bg-[#f7e0a3] text-[#110e0b] font-bold py-3 rounded-xl text-sm hover:bg-[#ebd292] transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Quay về ví
            </button>
          </>
        )}

      </div>
    </div>
  )
}
