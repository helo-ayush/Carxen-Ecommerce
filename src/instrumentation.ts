export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { getSessionSecret } = await import('@/lib/server/session');
    getSessionSecret();
  }
}
