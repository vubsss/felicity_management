let recaptchaPromise = null

const loadRecaptcha = () => {
  if (recaptchaPromise) return recaptchaPromise

  recaptchaPromise = new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve(window.grecaptcha)
      return
    }

    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    if (!siteKey) {
      reject(new Error('Missing reCAPTCHA site key'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.grecaptcha)
    script.onerror = () => reject(new Error('Failed to load reCAPTCHA'))
    document.head.appendChild(script)
  })

  return recaptchaPromise
}

const waitForRecaptchaReady = (grecaptcha) => new Promise((resolve, reject) => {
  if (!grecaptcha || typeof grecaptcha.ready !== 'function') {
    reject(new Error('reCAPTCHA is unavailable'))
    return
  }

  let completed = false
  const timer = window.setTimeout(() => {
    if (completed) return
    completed = true
    reject(new Error('reCAPTCHA initialization timed out'))
  }, 10000)

  grecaptcha.ready(() => {
    if (completed) return
    completed = true
    window.clearTimeout(timer)
    resolve(grecaptcha)
  })
})

export const prewarmRecaptcha = async () => {
  const grecaptcha = await loadRecaptcha()
  await waitForRecaptchaReady(grecaptcha)
  return grecaptcha
}

export const getRecaptchaToken = async (action) => {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
  const grecaptcha = await prewarmRecaptcha()

  if (typeof grecaptcha.execute !== 'function') {
    throw new Error('reCAPTCHA execute is unavailable')
  }

  return grecaptcha.execute(siteKey, { action })
}
