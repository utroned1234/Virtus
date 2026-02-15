'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import BottomNav from '@/components/ui/BottomNav'

interface VipPackage {
  id: number
  level: number
  name: string
  investment_bs: number
  daily_profit_bs: number
}

interface BonusRule {
  id: number
  level: number
  percentage: number
}

export default function TablesPage() {
  const [packages, setPackages] = useState<VipPackage[]>([])
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Usar cache: 'no-store' para obtener siempre datos frescos
        const [pkgRes, bonusRes] = await Promise.all([
          fetch('/api/packages', { cache: 'no-store' }),
          fetch('/api/bonus-rules', { cache: 'no-store' })
        ])

        if (pkgRes.ok) {
          const data = await pkgRes.json()
          setPackages(data)
        }

        if (bonusRes.ok) {
          const bonusData = await bonusRes.json()
          setBonusRules(bonusData)
        }
      } catch (error) {
        console.error('Error fetching tables:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const calculateMonthly = (profit: number) => {
    return (profit * 30).toFixed(2)
  }

  const calculateYearly = (profit: number) => {
    return (profit * 365).toFixed(2)
  }

  const calculateTwoYears = (profit: number) => {
    return (profit * 730).toFixed(2)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <p className="text-gold text-xl">Cargando tablas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-screen-xl mx-auto p-3 space-y-3">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gold gold-glow">Tabla de Ganancias</h1>
          <p className="mt-1 text-white/60 uppercase tracking-wider text-[10px] font-light">
            Resumen de paquetes y bonos
          </p>
        </div>

        <Card className="overflow-x-auto !p-3">
          <h2 className="text-sm font-bold text-gold mb-1">Tabla de Paquetes</h2>
          <p className="text-[9px] text-white/60 mb-2">
            Proyección de ganancias diarias, mensuales, anuales y bienales.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b border-gold border-opacity-30">
                  <th className="text-left py-1 px-1 text-gold uppercase text-[8px]">Paquete</th>
                  <th className="text-right py-1 px-1 text-gold uppercase text-[8px]">Inversión</th>
                  <th className="text-right py-1 px-1 text-gold uppercase text-[8px]">Diario</th>
                  <th className="text-right py-1 px-1 text-gold uppercase text-[8px]">Mensual</th>
                  <th className="text-right py-1 px-1 text-gold uppercase text-[8px]">1 Año</th>
                  <th className="text-right py-1 px-1 text-gold uppercase text-[8px]">2 Años</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={`table-${pkg.id}`} className="border-b border-gold border-opacity-10">
                    <td className="py-1 px-1 text-white font-medium text-[9px]">{pkg.name}</td>
                    <td className="py-1 px-1 text-white/60 text-right">${pkg.investment_bs.toFixed(0)}</td>
                    <td className="py-1 px-1 text-white/60 text-right">${pkg.daily_profit_bs.toFixed(2)}</td>
                    <td className="py-1 px-1 text-green-400 text-right font-medium">
                      ${calculateMonthly(pkg.daily_profit_bs)}
                    </td>
                    <td className="py-1 px-1 text-gold text-right font-bold">
                      ${calculateYearly(pkg.daily_profit_bs)}
                    </td>
                    <td className="py-1 px-1 text-gold-bright text-right font-bold">
                      ${calculateTwoYears(pkg.daily_profit_bs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-x-auto !p-3">
          <h2 className="text-sm font-bold text-gold mb-1">Bono de Patrocinio</h2>
          <p className="text-[9px] text-white/60 mb-2">
            Bonos por niveles. Ejemplo: con 5 personas por nivel.
          </p>

          {/* Tabla de porcentajes por nivel */}
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="border-b border-gold border-opacity-30">
                  <th className="text-left py-1 px-1 text-gold uppercase text-[8px]">Nivel</th>
                  <th className="text-center py-1 px-1 text-gold uppercase text-[8px]">% Bono</th>
                  {packages.map((pkg) => (
                    <th key={`bonus-head-${pkg.id}`} className="text-right py-1 px-1 text-gold uppercase text-[8px]">
                      {pkg.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bonusRules.map((rule) => (
                  <tr key={`bonus-${rule.id}`} className="border-b border-gold border-opacity-10">
                    <td className="py-1 px-1 text-white font-medium">Nivel {rule.level}</td>
                    <td className="py-1 px-1 text-center text-green-400 font-bold">{rule.percentage}%</td>
                    {packages.map((pkg) => (
                      <td key={`bonus-${rule.id}-${pkg.id}`} className="py-1 px-1 text-white/60 text-right">
                        ${((pkg.investment_bs * rule.percentage) / 100).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ejemplo con 5 personas por nivel */}
          <div className="mt-3 p-2 bg-dark-card bg-opacity-50 rounded-lg border border-gold/20">
            <h3 className="text-[10px] font-bold text-gold mb-1">Ejemplo: 5 personas por nivel</h3>
            <p className="text-[8px] text-white/60 mb-2">
              Si tienes 5 personas en cada nivel con diferentes paquetes:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="border-b border-gold border-opacity-30">
                    <th className="text-left py-1 px-1 text-gold uppercase text-[8px]">Nivel</th>
                    {packages.map((pkg) => (
                      <th key={`example-head-${pkg.id}`} className="text-right py-1 px-1 text-gold uppercase text-[8px]">
                        {pkg.name}
                      </th>
                    ))}
                    <th className="text-right py-1 px-1 text-gold-bright uppercase text-[8px] font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {bonusRules.map((rule) => {
                    const totalByLevel = packages.reduce((sum, pkg) =>
                      sum + ((pkg.investment_bs * rule.percentage) / 100) * 5, 0
                    )
                    return (
                      <tr key={`example-${rule.id}`} className="border-b border-gold border-opacity-10">
                        <td className="py-1 px-1 text-white font-medium">
                          Nivel {rule.level}
                          <span className="text-[8px] text-white/60 ml-1">(5 pers.)</span>
                        </td>
                        {packages.map((pkg) => (
                          <td key={`example-${rule.id}-${pkg.id}`} className="py-1 px-1 text-green-400 text-right">
                            ${(((pkg.investment_bs * rule.percentage) / 100) * 5).toFixed(2)}
                          </td>
                        ))}
                        <td className="py-1 px-1 text-gold-bright text-right font-bold">
                          ${totalByLevel.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Total general */}
                  <tr className="border-t-2 border-gold border-opacity-50 bg-gold/5">
                    <td className="py-1 px-1 text-gold font-bold uppercase text-[9px]">
                      Total General
                    </td>
                    {packages.map((pkg) => {
                      const totalByPackage = bonusRules.reduce((sum, rule) =>
                        sum + ((pkg.investment_bs * rule.percentage) / 100) * 5, 0
                      )
                      return (
                        <td key={`total-pkg-${pkg.id}`} className="py-1 px-1 text-gold text-right font-bold">
                          ${totalByPackage.toFixed(2)}
                        </td>
                      )
                    })}
                    <td className="py-1 px-1 text-gold-bright text-right font-bold text-[10px]">
                      ${bonusRules.reduce((sum, rule) =>
                        sum + packages.reduce((pkgSum, pkg) =>
                          pkgSum + ((pkg.investment_bs * rule.percentage) / 100) * 5, 0
                        ), 0
                      ).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[8px] text-white/60 mt-2 italic">
              * Los bonos se pagan una sola vez cuando tus referidos activan su paquete JADE.
            </p>
          </div>
        </Card>

        {/* Explicación del Plan de Bonos */}
        <Card className="!p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            <h2 className="text-sm font-bold text-[#34D399] uppercase tracking-wider">
              Bono de Patrocinio — Cómo Funciona
            </h2>
          </div>

          <p className="text-[10px] text-white/60 mb-3 leading-relaxed">
            Cuando un referido compra un paquete y el administrador lo aprueba, se distribuyen bonos en <span className="text-[#34D399] font-semibold">5 niveles de profundidad</span>.
          </p>

          {/* Tabla de niveles */}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-[#34D399]/30">
                  <th className="text-left py-2 px-2 text-[#34D399] uppercase text-[8px] font-bold">Nivel</th>
                  <th className="text-center py-2 px-2 text-[#34D399] uppercase text-[8px] font-bold">Porcentaje</th>
                  <th className="text-left py-2 px-2 text-[#34D399] uppercase text-[8px] font-bold">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/8">
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#34D399]/20 flex items-center justify-center text-[#34D399] text-[9px] font-bold">1</span>
                      <span className="text-white font-semibold">Directos</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[#FBBF24] font-bold text-xs">15%</span>
                  </td>
                  <td className="py-2 px-2 text-white/70 leading-relaxed">
                    <span className="text-[#34D399] font-semibold">10%</span> va directo al patrocinador + <span className="text-[#34D399] font-semibold">5%</span> se reparte entre todos los referidos directos
                  </td>
                </tr>
                <tr className="border-b border-white/8">
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#AB82FF]/20 flex items-center justify-center text-[#AB82FF] text-[9px] font-bold">2</span>
                      <span className="text-white font-semibold">Nivel 2</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[#AB82FF] font-bold text-xs">3%</span>
                  </td>
                  <td className="py-2 px-2 text-white/70">Referidos de tus referidos</td>
                </tr>
                <tr className="border-b border-white/8">
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#64B5F6]/20 flex items-center justify-center text-[#64B5F6] text-[9px] font-bold">3</span>
                      <span className="text-white font-semibold">Nivel 3</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[#64B5F6] font-bold text-xs">0.5%</span>
                  </td>
                  <td className="py-2 px-2 text-white/70">Tercer nivel de profundidad</td>
                </tr>
                <tr className="border-b border-white/8">
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#66BB6A]/20 flex items-center justify-center text-[#66BB6A] text-[9px] font-bold">4</span>
                      <span className="text-white font-semibold">Nivel 4</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[#66BB6A] font-bold text-xs">0.4%</span>
                  </td>
                  <td className="py-2 px-2 text-white/70">Cuarto nivel de profundidad</td>
                </tr>
                <tr>
                  <td className="py-2 px-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#FBBF24]/20 flex items-center justify-center text-[#FBBF24] text-[9px] font-bold">5</span>
                      <span className="text-white font-semibold">Nivel 5</span>
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[#FBBF24] font-bold text-xs">0.2%</span>
                  </td>
                  <td className="py-2 px-2 text-white/70">Quinto nivel de profundidad</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Ejemplo práctico */}
          <div className="p-3 rounded-xl border border-[#FBBF24]/20" style={{ background: 'rgba(251, 191, 36, 0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-[#FBBF24]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-[11px] font-bold text-[#FBBF24]">Ejemplo Nivel 1</h3>
            </div>
            <p className="text-[10px] text-white/70 leading-relaxed mb-2">
              Si el usuario <span className="text-white font-semibold">A</span> patrocina a <span className="text-white font-semibold">B</span> y <span className="text-white font-semibold">C</span>, y <span className="text-white font-semibold">B</span> compra JADE 6 (<span className="text-[#FBBF24] font-semibold">100 Bs</span>):
            </p>
            <div className="space-y-1.5 ml-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                <p className="text-[10px] text-white/80">
                  <span className="text-white font-semibold">A</span> recibe <span className="text-[#34D399] font-bold">10 Bs</span> <span className="text-white/50">(10% directo)</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#AB82FF]" />
                <p className="text-[10px] text-white/80">
                  <span className="text-white font-semibold">B</span> y <span className="text-white font-semibold">C</span> reciben <span className="text-[#AB82FF] font-bold">2.50 Bs c/u</span> <span className="text-white/50">(5% ÷ 2 referidos)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Nota niveles 2-5 */}
          <div className="mt-3 p-3 rounded-xl border border-[#34D399]/15" style={{ background: 'rgba(52, 211, 153, 0.04)' }}>
            <p className="text-[10px] text-white/60 leading-relaxed">
              <span className="text-[#34D399] font-semibold">Niveles 2 al 5:</span> Se aplica el porcentaje directamente sobre el monto de inversión del paquete comprado, subiendo por la cadena de patrocinadores.
            </p>
          </div>

          <p className="text-[8px] text-white/40 mt-3 text-center italic">
            * Los bonos se activan cuando el administrador aprueba la compra del paquete.
          </p>
        </Card>
      </div>

      <p className="mt-8 text-[10px] text-white/20 text-center px-4">
        © 2026 Virtus. Todos los derechos reservados. El contenido y la marca están protegidos por la legislación vigente.
      </p>

      <BottomNav />
    </div>
  )
}
