import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Route guard: unauthenticated -> login, authenticated non-operator -> 404,
 * operator -> the page.
 *
 * redirect() and notFound() throw by design in Next, which is what makes them
 * assertable: the guard either throws the right control-flow signal or returns
 * the operator.
 */

const redirect = vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`) })
const notFound = vi.fn(() => { throw new Error('NOT_FOUND') })
const auth = vi.fn()
const operatorFetch = vi.fn()

vi.mock('next/navigation', () => ({ redirect, notFound }))
vi.mock('@clerk/nextjs/server', () => ({ auth }))
vi.mock('@/lib/operator/client', () => ({ operatorFetch }))

const { requireOperatorPage } = await import('@/lib/operator/guard')

beforeEach(() => {
  redirect.mockClear(); notFound.mockClear()
  auth.mockReset(); operatorFetch.mockReset()
})

describe('requireOperatorPage', () => {
  it('sends an unauthenticated visitor to sign-in', async () => {
    auth.mockResolvedValue({ userId: null })
    await expect(requireOperatorPage()).rejects.toThrow('REDIRECT:/sign-in')
    expect(operatorFetch).not.toHaveBeenCalled()
  })

  it('404s a signed-in subscriber who is not an operator', async () => {
    // NOT a forbidden page. A 403 would tell a subscriber the route exists and
    // that some accounts can reach it, which is an invitation.
    auth.mockResolvedValue({ userId: 'user_sub' })
    operatorFetch.mockResolvedValue({ ok: false, status: 403, data: null,
                                      error: 'Operator access required' })
    await expect(requireOperatorPage()).rejects.toThrow('NOT_FOUND')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('404s when the backend is unreachable, rather than rendering a shell', async () => {
    auth.mockResolvedValue({ userId: 'user_op' })
    operatorFetch.mockResolvedValue({ ok: false, status: 504, data: null,
                                      error: 'Backend unreachable' })
    await expect(requireOperatorPage()).rejects.toThrow('NOT_FOUND')
  })

  it('returns the operator for a real operator', async () => {
    auth.mockResolvedValue({ userId: 'user_op' })
    const me = { clerk_user_id: 'user_op', email: 'e@b.c', display_name: 'Eli',
                 role: 'operator', is_owner: false, can_promote: false }
    operatorFetch.mockResolvedValue({ ok: true, status: 200, data: me,
                                      error: null })
    await expect(requireOperatorPage()).resolves.toEqual(me)
    expect(redirect).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })

  it('asks the backend, never the browser, whether someone is an operator', async () => {
    auth.mockResolvedValue({ userId: 'user_op' })
    operatorFetch.mockResolvedValue({ ok: true, status: 200,
      data: { role: 'owner', is_owner: true }, error: null })
    await requireOperatorPage()
    expect(operatorFetch).toHaveBeenCalledWith('/operator/me')
  })
})
