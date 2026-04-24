import { redirect } from 'next/navigation'

// Legacy path - world plans now have their own dedicated flow at /worlds
export default function LegacyWorldPlansPage() {
  redirect('/worlds')
}
