import { signInWithEmail } from "./actions"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>
}) {
  const { sent, error } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900">AnyGrade</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to your teacher account</p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Check your email — we sent you a sign-in link.
          </div>
        ) : (
          <form action={signInWithEmail} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@school.edu.ph"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{decodeURIComponent(error)}</p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
            >
              Send sign-in link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          No password needed — we'll email you a magic link.
        </p>
      </div>
    </div>
  )
}
