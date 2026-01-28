'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import apiService from '@/services/api'

function VerifyOTPContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    // Get email from URL search params
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const emailParam = params.get('email')
      if (emailParam) {
        setEmail(emailParam)
        setMounted(true)
      } else {
        router.replace('/admin/login')
      }
    }
  }, [router]) // Include router in dependencies but it won't change

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))])

    // Focus next input
    if (element.value !== '' && element.nextSibling) {
      element.nextSibling.focus()
    }
  }

  const handleKeyDown = (e, index) => {
    // Focus previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
      e.target.previousSibling.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpValue = otp.join('')
    
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await apiService.verifyLoginOTP(email, otpValue)
      
      // Store token in localStorage
      if (response.data?.token) {
        localStorage.setItem('adminToken', response.data.token)
        localStorage.setItem('adminEmail', email)
      }

      // Redirect to dashboard
      router.push('/admin/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError('')
    setResending(true)

    try {
      await apiService.resendLoginOTP(email)
      alert('OTP resent successfully! Please check your email.')
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.')
    } finally {
      setResending(false)
    }
  }

  if (!mounted || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Verify OTP</h2>
        <p className="text-sm text-gray-600 mb-6">
          We&apos;ve sent a 6-digit code to <strong>{email}</strong>
        </p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enter OTP
            </label>
            <div className="flex gap-2 justify-between">
              {otp.map((data, index) => {
                return (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    disabled={loading}
                  />
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Didn&apos;t receive the code?{' '}
            <button
              onClick={handleResendOTP}
              disabled={resending}
              className="text-black font-medium hover:underline disabled:text-gray-400"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function VerifyOTP() {
  return <VerifyOTPContent />
}

export default VerifyOTP
