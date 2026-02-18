'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import Card from '@/components/ui/Card'
import CountrySelect from '@/components/ui/CountrySelect'
import { useLanguage } from '@/context/LanguageContext'

const COUNTRIES = [
  // América Latina
  { code: 'AR', name: 'Argentina' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DO', name: 'Rep. Dominicana' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'HN', name: 'Honduras' },
  { code: 'MX', name: 'México' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'VE', name: 'Venezuela' },
  // Norteamérica
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  // Europa
  { code: 'ES', name: 'España' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'CH', name: 'Suiza' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Suecia' },
  { code: 'NO', name: 'Noruega' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'PL', name: 'Polonia' },
  { code: 'CZ', name: 'Rep. Checa' },
  { code: 'HU', name: 'Hungría' },
  { code: 'RO', name: 'Rumania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Grecia' },
  { code: 'RU', name: 'Rusia' },
  { code: 'UA', name: 'Ucrania' },
  // Asia
  { code: 'CN', name: 'China' },
  { code: 'JP', name: 'Japón' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'MY', name: 'Malasia' },
  { code: 'SG', name: 'Singapur' },
  { code: 'PK', name: 'Pakistán' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'TR', name: 'Turquía' },
  { code: 'IL', name: 'Israel' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'AE', name: 'Emiratos Árabes' },
  // África
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'EG', name: 'Egipto' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenia' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'DZ', name: 'Argelia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'ET', name: 'Etiopía' },
  // Oceanía
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  // Otros
  { code: 'OTHER', name: 'Otro' },
]

export default function SignupClient({
  initialSponsorCode = '',
}: {
  initialSponsorCode?: string
}) {
  const router = useRouter()
  const defaultSponsorCode = initialSponsorCode || 'W98B1177'
  const [formData, setFormData] = useState({
    sponsor_code: defaultSponsorCode,
    full_name: '',
    carnet: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
    language: 'es',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState({ username: '', password: '' })
  const { showToast } = useToast()
  const { t } = useLanguage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsor_code: formData.sponsor_code,
          full_name: formData.full_name,
          carnet: formData.carnet,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          country: formData.country || null,
          language: formData.language,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrarse')
        return
      }

      setCreatedCredentials({
        username: formData.username,
        password: formData.password,
      })
      setShowSuccessModal(true)
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Logo + Info */}
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl animate-pulse" />
            <img
              src="/logo.png"
              alt="VIRTUS Logo"
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-widest text-white">
              VIRT<span className="text-[#34D399]">U</span>S
            </h1>
          </div>
        </div>

        {/* Titulo Registro */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gold">{t('signup.title')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('signup.sponsor')}
            type="text"
            value={formData.sponsor_code}
            onChange={(e) => setFormData({ ...formData, sponsor_code: e.target.value })}
            placeholder={t('signup.sponsor')}
            readOnly={true}
            disabled={true}
          />

          <Input
            label={t('signup.fullName')}
            type="text"
            required
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />

          <Input
            label="C.I"
            type="text"
            required
            value={formData.carnet}
            onChange={(e) => setFormData({ ...formData, carnet: e.target.value })}
            placeholder="Ej: 12345678"
          />

          {/* País */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider">
              {t('signup.country')}
            </label>
            <CountrySelect
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
              countries={COUNTRIES}
              placeholder={t('signup.selectCountry')}
            />
          </div>

          <Input
            label={t('signup.username')}
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="juanperez / juan@gmail.com"
          />

          <Input
            label={t('signup.email')}
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label={t('signup.password')}
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <Input
            label={t('signup.confirmPassword')}
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />

          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-btn">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? t('signup.submitting') : t('signup.submit')}
          </Button>

          <p className="text-center text-text-secondary">
            {t('signup.hasAccount')}{' '}
            <Link href="/login" className="text-gold hover:text-gold-bright">
              {t('signup.login')}
            </Link>
          </p>
        </form>
      </div>
      <p className="mt-8 text-[10px] text-white/20 text-center px-4">
        © 2026 Virtus. Todos los derechos reservados. El contenido y la marca están protegidos por la legislación vigente.
      </p>

      {/* Modal de registro exitoso */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80">
          <Card glassEffect>
            <div className="text-center space-y-4 p-2">
              <div className="text-5xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-gold">¡Registro Exitoso!</h2>
              <p className="text-text-secondary text-sm">
                Tu cuenta ha sido creada correctamente. Guarda tus credenciales:
              </p>

              <div className="bg-dark-card border border-gold/30 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-text-secondary uppercase">Usuario</p>
                  <p className="text-gold font-bold text-lg">{createdCredentials.username}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary uppercase">Contraseña</p>
                  <p className="text-gold font-bold text-lg">{createdCredentials.password}</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary">
                Recuerda guardar estos datos en un lugar seguro
              </p>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  setShowSuccessModal(false)
                  router.push('/login')
                }}
              >
                Aceptar e Iniciar Sesión
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
