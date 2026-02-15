'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type LanguageCode = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'ru' | 'zh' | 'ar' | 'hi' | 'ja' | 'tr' | 'ko' | 'nl' | 'pl'

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('es')

  useEffect(() => {
    // Cargar idioma desde localStorage
    const savedLang = localStorage.getItem('virtus_language') as LanguageCode
    if (savedLang) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang)
    localStorage.setItem('virtus_language', lang)
  }

  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key // Retorna la key si no encuentra traducción
      }
    }

    return typeof value === 'string' ? value : key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

// Traducciones
const translations: Record<LanguageCode, any> = {
  es: {
    // Navegación
    nav: {
      home: 'Inicio',
      vip: 'Paquetes',
      tasks: 'Tareas',
      futuros: 'Futuros',
      wallet: 'Billetera',
      team: 'Equipo',
      admin: 'Admin',
      logout: 'Salir',
    },
    // Home
    home: {
      welcome: 'Bienvenido',
      balance: 'Balance Total',
      dailyProfit: 'Ganancia Diaria',
      totalEarnings: 'Ganancias Totales',
      referrals: 'Referidos',
      rank: 'Sin Rango',
      currentRank: 'Rango Actual',
      capital: 'Capital Futuros',
      todayEarnings: 'Ganancias de Hoy',
      weekEarnings: 'Esta Semana',
      monthEarnings: 'Este Mes',
      allTimeEarnings: 'Total Histórico',
      copyLink: 'Copiar link',
      code: 'Código',
      earnings: 'Ganancias',
    },
    // VIP
    vip: {
      title: 'Paquetes VIP',
      subtitle: 'Elige tu plan de inversión',
      active: 'ACTIVO',
      pending: 'PENDIENTE',
      rejected: 'RECHAZADO',
      investment: 'Inversión',
      dailyProfit: 'Ganancia Diaria',
      selectPlan: 'Seleccionar Plan',
      currentPlan: 'Plan Actual',
      paymentMethod: 'Método de Pago',
      uploadProof: 'Subir Comprobante',
      submit: 'Enviar Solicitud',
      processing: 'Procesando...',
    },
    // Futuros
    futuros: {
      title: 'Trading Futuros',
      signals: 'Señales',
      wallet: 'Billetera',
      code: 'Código',
      activeSignal: 'Señal Activa',
      enterCode: 'Ingresar Código',
      execute: 'Ejecutar',
      executed: 'EJECUTADA',
      profit: 'Ganancia',
      globalBonus: 'Bono Global',
      capitalBefore: 'Capital Anterior',
      capitalAfter: 'Capital Nuevo',
      currentCapital: 'Capital Actual',
      history: 'Historial',
    },
    // Billetera
    wallet: {
      title: 'Mi Billetera',
      balance: 'Balance Disponible',
      withdraw: 'Retirar',
      amount: 'Monto',
      address: 'Dirección USDT (TRC20)',
      submit: 'Solicitar Retiro',
      history: 'Historial de Transacciones',
      type: 'Tipo',
      date: 'Fecha',
      status: 'Estado',
      pending: 'Pendiente',
      completed: 'Completado',
      rejected: 'Rechazado',
    },
    // Equipo
    team: {
      title: 'Mi Equipo',
      totalReferrals: 'Total de Referidos',
      activeReferrals: 'Referidos Activos',
      teamEarnings: 'Ganancias del Equipo',
      myLink: 'Mi Enlace de Referido',
      copy: 'Copiar',
      copied: 'Copiado',
      level: 'Nivel',
      direct: 'Directos',
      name: 'Nombre',
      username: 'Usuario',
      package: 'Paquete',
      status: 'Estado',
      active: 'Activo',
      inactive: 'Inactivo',
    },
    // Login
    login: {
      title: 'Inicia sesión en tu cuenta',
      username: 'Usuario o Email',
      password: 'Contraseña',
      submit: 'Iniciar Sesión',
      noAccount: '¿No tienes cuenta?',
      register: 'Regístrate',
    },
    // Signup
    signup: {
      title: 'Crear Cuenta',
      sponsor: 'Código de Patrocinador',
      fullName: 'Nombre Completo',
      country: 'País',
      selectCountry: '— Selecciona —',
      username: 'Usuario o Gmail',
      email: 'Email',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      submit: 'Registrarse',
      submitting: 'Registrando...',
      hasAccount: '¿Ya tienes cuenta?',
      login: 'Inicia sesión',
      success: 'Registro Exitoso',
      credentials: 'Guarda tus credenciales',
    },
    // Admin
    admin: {
      title: 'Panel de Administración',
      users: 'Usuarios',
      purchases: 'Compras',
      withdrawals: 'Retiros',
      futuros: 'Futuros',
      signals: 'Señales',
      approve: 'Aprobar',
      reject: 'Rechazar',
      total: 'Total',
      pending: 'Pendientes',
      approved: 'Aprobadas',
      rejected: 'Rechazadas',
    },
    // Común
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Guardar',
      delete: 'Eliminar',
      edit: 'Editar',
      view: 'Ver',
      close: 'Cerrar',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      yes: 'Sí',
      no: 'No',
      allRightsReserved: 'Todos los derechos reservados',
    },
  },
  en: {
    nav: {
      home: 'Home',
      vip: 'Packages',
      tasks: 'Tasks',
      futuros: 'Futures',
      wallet: 'Wallet',
      team: 'Team',
      admin: 'Admin',
      logout: 'Logout',
    },
    home: {
      welcome: 'Welcome',
      balance: 'Total Balance',
      dailyProfit: 'Daily Profit',
      totalEarnings: 'Total Earnings',
      referrals: 'Referrals',
      rank: 'No Rank',
      currentRank: 'Current Rank',
      capital: 'Futures Capital',
      todayEarnings: 'Today\'s Earnings',
      weekEarnings: 'This Week',
      monthEarnings: 'This Month',
      allTimeEarnings: 'All Time',
      copyLink: 'Copy link',
      code: 'Code',
      earnings: 'Earnings',
    },
    vip: {
      title: 'VIP Packages',
      subtitle: 'Choose your investment plan',
      active: 'ACTIVE',
      pending: 'PENDING',
      rejected: 'REJECTED',
      investment: 'Investment',
      dailyProfit: 'Daily Profit',
      selectPlan: 'Select Plan',
      currentPlan: 'Current Plan',
      paymentMethod: 'Payment Method',
      uploadProof: 'Upload Proof',
      submit: 'Submit Request',
      processing: 'Processing...',
    },
    futuros: {
      title: 'Futures Trading',
      signals: 'Signals',
      wallet: 'Wallet',
      code: 'Code',
      activeSignal: 'Active Signal',
      enterCode: 'Enter Code',
      execute: 'Execute',
      executed: 'EXECUTED',
      profit: 'Profit',
      globalBonus: 'Global Bonus',
      capitalBefore: 'Previous Capital',
      capitalAfter: 'New Capital',
      currentCapital: 'Current Capital',
      history: 'History',
    },
    wallet: {
      title: 'My Wallet',
      balance: 'Available Balance',
      withdraw: 'Withdraw',
      amount: 'Amount',
      address: 'USDT Address (TRC20)',
      submit: 'Request Withdrawal',
      history: 'Transaction History',
      type: 'Type',
      date: 'Date',
      status: 'Status',
      pending: 'Pending',
      completed: 'Completed',
      rejected: 'Rejected',
    },
    team: {
      title: 'My Team',
      totalReferrals: 'Total Referrals',
      activeReferrals: 'Active Referrals',
      teamEarnings: 'Team Earnings',
      myLink: 'My Referral Link',
      copy: 'Copy',
      copied: 'Copied',
      level: 'Level',
      direct: 'Direct',
      name: 'Name',
      username: 'Username',
      package: 'Package',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
    },
    login: {
      title: 'Sign in to your account',
      username: 'Username or Email',
      password: 'Password',
      submit: 'Sign In',
      noAccount: 'Don\'t have an account?',
      register: 'Register',
    },
    signup: {
      title: 'Create Account',
      sponsor: 'Sponsor Code',
      fullName: 'Full Name',
      country: 'Country',
      selectCountry: '— Select —',
      username: 'Username or Gmail',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      submit: 'Register',
      submitting: 'Registering...',
      hasAccount: 'Already have an account?',
      login: 'Sign in',
      success: 'Registration Successful',
      credentials: 'Save your credentials',
    },
    admin: {
      title: 'Admin Panel',
      users: 'Users',
      purchases: 'Purchases',
      withdrawals: 'Withdrawals',
      futuros: 'Futures',
      signals: 'Signals',
      approve: 'Approve',
      reject: 'Reject',
      total: 'Total',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
    },
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      close: 'Close',
      search: 'Search',
      filter: 'Filter',
      all: 'All',
      yes: 'Yes',
      no: 'No',
      allRightsReserved: 'All rights reserved',
    },
  },
  pt: {
    nav: {
      home: 'Início',
      vip: 'Pacotes',
      tasks: 'Tarefas',
      futuros: 'Futuros',
      wallet: 'Carteira',
      team: 'Equipe',
      admin: 'Admin',
      logout: 'Sair',
    },
    home: {
      welcome: 'Bem-vindo',
      balance: 'Saldo Total',
      dailyProfit: 'Lucro Diário',
      totalEarnings: 'Ganhos Totais',
      referrals: 'Referidos',
      rank: 'Sem Rank',
      currentRank: 'Rank Atual',
      capital: 'Capital Futuros',
      todayEarnings: 'Ganhos de Hoje',
      weekEarnings: 'Esta Semana',
      monthEarnings: 'Este Mês',
      allTimeEarnings: 'Total Histórico',
      copyLink: 'Copiar link',
      code: 'Código',
      earnings: 'Ganhos',
    },
    vip: {
      title: 'Pacotes VIP',
      subtitle: 'Escolha seu plano de investimento',
      active: 'ATIVO',
      pending: 'PENDENTE',
      rejected: 'REJEITADO',
      investment: 'Investimento',
      dailyProfit: 'Lucro Diário',
      selectPlan: 'Selecionar Plano',
      currentPlan: 'Plano Atual',
      paymentMethod: 'Método de Pagamento',
      uploadProof: 'Enviar Comprovante',
      submit: 'Enviar Solicitação',
      processing: 'Processando...',
    },
    futuros: {
      title: 'Trading Futuros',
      signals: 'Sinais',
      wallet: 'Carteira',
      code: 'Código',
      activeSignal: 'Sinal Ativo',
      enterCode: 'Digite o Código',
      execute: 'Executar',
      executed: 'EXECUTADO',
      profit: 'Lucro',
      globalBonus: 'Bônus Global',
      capitalBefore: 'Capital Anterior',
      capitalAfter: 'Novo Capital',
      currentCapital: 'Capital Atual',
      history: 'Histórico',
    },
    wallet: {
      title: 'Minha Carteira',
      balance: 'Saldo Disponível',
      withdraw: 'Sacar',
      amount: 'Quantia',
      address: 'Endereço USDT (TRC20)',
      submit: 'Solicitar Saque',
      history: 'Histórico de Transações',
      type: 'Tipo',
      date: 'Data',
      status: 'Status',
      pending: 'Pendente',
      completed: 'Concluído',
      rejected: 'Rejeitado',
    },
    team: {
      title: 'Minha Equipe',
      totalReferrals: 'Total de Referidos',
      activeReferrals: 'Referidos Ativos',
      teamEarnings: 'Ganhos da Equipe',
      myLink: 'Meu Link de Referido',
      copy: 'Copiar',
      copied: 'Copiado',
      level: 'Nível',
      direct: 'Diretos',
      name: 'Nome',
      username: 'Usuário',
      package: 'Pacote',
      status: 'Status',
      active: 'Ativo',
      inactive: 'Inativo',
    },
    login: {
      title: 'Entre na sua conta',
      username: 'Usuário ou Email',
      password: 'Senha',
      submit: 'Entrar',
      noAccount: 'Não tem uma conta?',
      register: 'Cadastre-se',
    },
    signup: {
      title: 'Criar Conta',
      sponsor: 'Código do Patrocinador',
      fullName: 'Nome Completo',
      country: 'País',
      selectCountry: '— Selecione —',
      username: 'Usuário ou Gmail',
      email: 'Email',
      password: 'Senha',
      confirmPassword: 'Confirmar Senha',
      submit: 'Registrar',
      submitting: 'Registrando...',
      hasAccount: 'Já tem uma conta?',
      login: 'Entre',
      success: 'Registro Bem-sucedido',
      credentials: 'Salve suas credenciais',
    },
    admin: {
      title: 'Painel de Administração',
      users: 'Usuários',
      purchases: 'Compras',
      withdrawals: 'Saques',
      futuros: 'Futuros',
      signals: 'Sinais',
      approve: 'Aprovar',
      reject: 'Rejeitar',
      total: 'Total',
      pending: 'Pendentes',
      approved: 'Aprovadas',
      rejected: 'Rejeitadas',
    },
    common: {
      loading: 'Carregando...',
      error: 'Erro',
      success: 'Sucesso',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      save: 'Salvar',
      delete: 'Excluir',
      edit: 'Editar',
      view: 'Ver',
      close: 'Fechar',
      search: 'Buscar',
      filter: 'Filtrar',
      all: 'Todos',
      yes: 'Sim',
      no: 'Não',
      allRightsReserved: 'Todos os direitos reservados',
    },
  },
  // Los demás idiomas tendrán traducciones básicas por ahora
  fr: { ...{} }, // Francés
  de: { ...{} }, // Alemán
  it: { ...{} }, // Italiano
  ru: { ...{} }, // Ruso
  zh: { ...{} }, // Chino
  ar: { ...{} }, // Árabe
  hi: { ...{} }, // Hindi
  ja: { ...{} }, // Japonés
  tr: { ...{} }, // Turco
  ko: { ...{} }, // Coreano
  nl: { ...{} }, // Holandés
  pl: { ...{} }, // Polaco
}

// Usar español como fallback para idiomas sin traducciones completas
Object.keys(translations).forEach(lang => {
  if (Object.keys(translations[lang as LanguageCode]).length === 0) {
    translations[lang as LanguageCode] = translations.es
  }
})
