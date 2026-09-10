import { redirect } from 'next/navigation'

/** Confirmation has one home: the owner-only staged slate in /command. */
export default function LegacyPublishPage() {
  redirect('/command')
}
