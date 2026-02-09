import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'

const Login = () => {
  const [form, setForm] = useState({
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await apiClient.post('/api/auth/login', form)
      const { token, role } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('role', role)
      navigate('/')
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to sign in. Try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-2xl font-semibold">Login</h1>
          <p className="text-sm text-base-content/70">Welcome Back!</p>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            <div>
                <label className="label" htmlFor="email">
                    <span className="label-text">Email</span>
                </label>
                <div className="form-control">
                <input
                    id="email"
                    name="email"
                    type="email"
                    className="input input-bordered"
                    placeholder="name@iiit.ac.in"
                    value={form.email}
                    onChange={handleChange}
                    required
                />
                </div>
            </div>
            <div>
                <label className="label" htmlFor="password">
                    <span className="label-text">Password</span>
                </label>
                <div className="form-control">
                    <input
                        id="password"
                        name="password"
                        type="password"
                        className="input input-bordered"
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>
            <button className="btn btn-primary w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-sm text-center text-base-content/70">
            New here? <Link className="link link-primary" to="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
