import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '../api/client'
import { getRecaptchaToken, prewarmRecaptcha } from '../utils/recaptcha'

const Signup = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    participantType: 'internal',
    organisation: '',
    contactNumber: ''
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    prewarmRecaptcha().catch(() => {})
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const recaptchaToken = await getRecaptchaToken('signup')
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        participantType: form.participantType,
        organisation: form.participantType === 'external' ? form.organisation : undefined,
        contactNumber: form.contactNumber,
        recaptchaToken
      }
      await apiClient.post('/api/auth/signup', payload)
      navigate('/login')
    } catch (err) {
      const message = err?.response?.data?.message || 'ReCAPTCHA failde. Try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const showOrganisation = form.participantType === 'external'

  return (
    <div className="lb-page lb-center">
      <div className="card w-full max-w-4xl bg-base-100 shadow-xl">
        <div className="card-body p-8">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-base-content/70">Register as an internal or external participant.</p>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            {error && (
              <div role="alert" className="alert alert-error">
                <span>{error}</span>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="firstName">
                  <span className="label-text">First name</span>
                </label>
              <div className="form-control w-full">
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Aarav"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                  <span className="label-text">Last name</span>
              </label>
              <div className="form-control w-full">
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Sharma"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            </div>
            <div>
              <label className="label" htmlFor="email">
                <span className="label-text">Email</span>
              </label>
              <div className="form-control w-full">
              <input
                id="email"
                name="email"
                type="email"
                className="input input-bordered w-full"
                placeholder="name@iiit.ac.in"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <span className="text-xs text-base-content/60 mt-1">
                Internal participants must use IIIT email domains.
              </span>
            </div>
            <div className="form-control w-full">
              <label className="label" htmlFor="password">
                <span className="label-text">Password</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input input-bordered w-full"
                placeholder="Minimum 6 characters"
                minLength={6}
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-control w-full">
              <label className="label" htmlFor="participantType">
                <span className="label-text">Participant type</span>
              </label>
              <select
                id="participantType"
                name="participantType"
                className="select select-bordered w-full"
                value={form.participantType}
                onChange={handleChange}
                required
              >
                <option value="internal">Internal (IIIT)</option>
                <option value="external">External</option>
              </select>
            </div>
            {showOrganisation && (
              <div className="form-control w-full">
                <label className="label" htmlFor="organisation">
                  <span className="label-text">Organisation</span>
                </label>
                <input
                  id="organisation"
                  name="organisation"
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Company or institute"
                  value={form.organisation}
                  onChange={handleChange}
                  required={showOrganisation}
                />
              </div>
            )}
            <div className="form-control w-full">
              <label className="label" htmlFor="contactNumber">
                <span className="label-text">Contact number</span>
              </label>
              <input
                id="contactNumber"
                name="contactNumber"
                type="tel"
                className="input input-bordered w-full"
                placeholder="Phone number"
                value={form.contactNumber}
                onChange={handleChange}
                required
              />
            </div>
            <button className="btn btn-success w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="text-sm text-center text-base-content/70">
            Already have an account? <Link className="link link-primary" to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
