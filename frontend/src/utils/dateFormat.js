const pad = (value) => String(value).padStart(2, '0')

const toValidDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDate = (value) => {
  const date = toValidDate(value)
  if (!date) return ''

  const day = pad(date.getDate())
  const month = pad(date.getMonth() + 1)
  const year = date.getFullYear()

  return `${day}-${month}-${year}`
}

export const formatDateTime = (value) => {
  const date = toValidDate(value)
  if (!date) return ''

  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())

  return `${formatDate(date)} ${hours}:${minutes}`
}
