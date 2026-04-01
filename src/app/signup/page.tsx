import SignupClient from './SignupClient'

export const dynamic = 'force-dynamic'

export default function SignupPage({
  searchParams,
}: {
  searchParams?: { ref?: string }
}) {
  const sponsorCode = searchParams?.ref || ''
  return <SignupClient initialSponsorCode={sponsorCode} />
}
