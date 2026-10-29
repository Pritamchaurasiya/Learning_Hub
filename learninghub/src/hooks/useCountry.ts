import { useContext } from 'react'
import { CountryContext, type CountryContextValue } from '../context/CountryContext'

export const useCountry = (): CountryContextValue => {
  const context = useContext(CountryContext)
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider')
  }
  return context
}
