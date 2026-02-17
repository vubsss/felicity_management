import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { getRecaptchaToken } from '../utils/recaptcha'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const recaptchaToken = await getRecaptchaToken('login')
      const response = await apiClient.post('/api/auth/login', { ...form, recaptchaToken })
      const { token, role } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      await refreshAuth()
      if (role === 'participant') {
        try {
          const prefsResponse = await apiClient.get('/api/participants/preferences')
          const interests = prefsResponse.data?.interests || []
          if (!interests.length) {
            navigate('/profile?onboarding=1')
            return
          }
        } catch (prefsError) {
          // Fall back to profile if preferences cannot be loaded
          navigate('/profile?onboarding=1')
          return
        }
      }
      navigate('/')
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to sign in. Try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (

    <div className="lb-page lb-center">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body p-8">
          <h2 className="text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-base-content/70">Login to your account.</p>
          
          {error && <div className="alert alert-error shadow-lg"><span>{error}</span></div>}

          <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
            <div className="form-control">
              <label className="label" htmlFor="email">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                className="input input-bordered focus:input-primary bg-base-100/50"
                value={form.email}
                onChange={handleChange}
                name="email"
                required
              />
            </div>
            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text font-medium">Password</span>
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="input input-bordered focus:input-primary bg-base-100/50"
                value={form.password}
                onChange={handleChange}
                name="password"
                required
              />
            </div>

            {/* ReCAPTCHA component is not defined in the original file,
                so it's commented out to avoid errors.
                If you intend to use it, please import it and define its state.
            <div className="form-control">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI" // Test key
                onChange={(token) => setRecaptchaToken(token)}
                theme="dark"
              />
            </div>
            */}

            <div className="form-control mt-6">
              <button
                type="submit"
                className="btn btn-success w-full text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? <span className="loading loading-spinner"></span> : 'Login'}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <div className="text-center">
            <p className="text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="link link-primary font-semibold hover:text-secondary transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
