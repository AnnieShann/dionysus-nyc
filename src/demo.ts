// DEMO MODE — bypass login/onboarding and drop straight into a seeded account.
// Flip DEMO_MODE to false to restore the real onboarding flow.
//
// Each account is a STABLE SpacetimeDB identity (non-expiring token minted from
// Maincloud), so the same persona persists across devices and live-sync works.
//   plain URL        -> masha
//   ?as=michael      -> michael
//   ?as=<unknown>    -> masha (fallback)
export const DEMO_MODE = true;

export type DemoAccount = { handle: string; token: string; identityHex: string };

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
  masha: {
    handle: 'masha',
    identityHex: 'c2003076f3ce1f89032995753c85fb598e33c4f82273d73bff851bcd5f946e51',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJoZXhfaWRlbnRpdHkiOiJjMjAwMzA3NmYzY2UxZjg5MDMyOTk1NzUzYzg1ZmI1OThlMzNjNGY4MjI3M2Q3M2JmZjg1MWJjZDVmOTQ2ZTUxIiwic3ViIjoiOTI2ZGRlNTUtNzQ5OS00NTZiLTgxMjUtYTUyMDNmMzc3NTQ0IiwiaXNzIjoibG9jYWxob3N0IiwiYXVkIjpbInNwYWNldGltZWRiIl0sImlhdCI6MTc4MDgyODE1MiwiZXhwIjpudWxsfQ.WoiV2YaeBCqGMQ1ORxxvZK1m_LPWlye-tYZMDxBwlZXgely3WPt1OKDMoUtPAZD7RymkYCmcxCsiJaR2TSKxZw',
  },
  michael: {
    handle: 'michael',
    identityHex: 'c200657f4dd3f285d2bf3a530a67814b30ceb32c5d9f60390f4db7e227533bea',
    token:
      'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJoZXhfaWRlbnRpdHkiOiJjMjAwNjU3ZjRkZDNmMjg1ZDJiZjNhNTMwYTY3ODE0YjMwY2ViMzJjNWQ5ZjYwMzkwZjRkYjdlMjI3NTMzYmVhIiwic3ViIjoiNDc1ZjNhOWMtYjZlZi00NTk5LWJmZjYtMzYwYjNiNzBhOTNhIiwiaXNzIjoibG9jYWxob3N0IiwiYXVkIjpbInNwYWNldGltZWRiIl0sImlhdCI6MTc4MDgyODE1MiwiZXhwIjpudWxsfQ.9y8yA4Ym6KIm3jL6SPxuYSrpKpgVkcRbaO6oyz_SWyPB9i5ZzTvmmEoC8tYHHWiASXoSQ2abEM9OuyqZ76LPpw',
  },
};

export function demoAccount(): DemoAccount | null {
  if (!DEMO_MODE || typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search).get('as')?.toLowerCase();
  return (p && DEMO_ACCOUNTS[p]) || DEMO_ACCOUNTS.masha;
}
