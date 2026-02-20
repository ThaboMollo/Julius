import { useEffect, useState } from 'react'
import logo from '/logo.png'

interface SplashScreenProps {
  onDone: () => void
}

export function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1700)
    const doneTimer = setTimeout(() => onDone(), 2100)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: 'linear-gradient(160deg, #3B4A2F 0%, #2A3520 100%)' }}
    >
      <img
        src={logo}
        alt="Julius"
        className="w-32 h-32 rounded-full shadow-2xl mb-6"
        style={{ border: '3px solid #C4A86B' }}
      />
      <h1
        className="text-3xl font-bold tracking-widest uppercase"
        style={{ color: '#C4A86B' }}
      >
        Julius
      </h1>
      <p className="text-sm mt-2" style={{ color: '#A8B8A0' }}>
        Personal Budget Tracker
      </p>
    </div>
  )
}
