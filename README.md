# Core Values — Google sign-in + Vercel

This version adds server-side Google OpenID Connect authentication to the existing journal. It uses authorization code flow, PKCE, state, nonce, verified Google ID tokens, and signed HttpOnly sessions. Google tokens and client secrets never reach the browser.

Journal records remain local to the browser, stored separately under each Google account's subject identifier. There is no cloud sync, database, or Google Drive access. Signing out does not erase records from browser storage. This is account separation, not encryption against somebody who controls the device.

## Deploy

1. Import this project into your Vercel account, or install Vercel's CLI and run `vercel` from this directory. Select framework **Other**. `vercel.json` supplies the output directory, protected app route, and Node functions. Do not deploy `dist/` as a public static website; only `public/` is the static output.
2. Obtain the production project domain. Use one stable domain for `APP_URL` and OAuth. Avoid preview domains for Google sign-in unless you register each exact callback separately.
3. In Google Cloud, select/create your project. Configure Google Auth Platform branding, audience, and contact email. Create an OAuth client of type **Web application**. The scopes are `openid`, `email`, and `profile` only. If the consent configuration requires test users, add the accounts that will use the app.
4. Register this exact **Authorized redirect URI**, replacing the hostname:
   `https://YOUR-PROJECT.vercel.app/api/auth/callback`
   The backend handles the flow, so no JavaScript origin is needed for a Google client-side SDK.
5. In Vercel → project → Settings → Environment Variables, add:

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_CLIENT_ID` | Web application client ID |
   | `GOOGLE_CLIENT_SECRET` | OAuth client secret |
   | `SESSION_SECRET` | A random secret, at least 32 characters; generate with `openssl rand -hex 32` |
   | `APP_URL` | Exact HTTPS production origin, e.g. `https://YOUR-PROJECT.vercel.app` |
   | `ALLOWED_EMAILS` | Optional comma-separated allowed accounts; leave empty for any verified Google account |

   Use the Production environment, then redeploy. Do not put secrets in HTML, Git, or chat.
6. Run `npm ci` and `npm test` locally. Deploy production with `vercel --prod` after configuring the account and project. For local development, use an HTTPS development origin compatible with the secure `__Host-` cookies, and register its exact OAuth callback separately.
7. Verify: logged-out page shows Google sign-in; consent returns to the journal; reload keeps the session; sign-out blocks the journal; switching Google accounts shows separate records. Check the allowlist if enabled. Verify that `/dist/index.html` is not publicly served.

## Bring existing records over

On the old app, export a JSON backup. Sign in to the Vercel app with the intended Google account, open **Backup & restore**, and import the file. Browser storage cannot automatically transfer between the ChatGPT Site origin and Vercel. The app does not silently attach existing shared-browser records to the first Google account.

## Session behavior

Sessions last seven days and are signed, not stored in a database. Logout clears the current browser's cookies; there is no global session revocation service. Rotate `SESSION_SECRET` to invalidate all sessions. The optional email allowlist is checked on every session read.

## Existing ChatGPT Site

The existing `.openai/hosting.json` is retained as source metadata. Vercel reads `vercel.json`. The original ChatGPT-hosted static deployment is unchanged; Google authentication is implemented for the Vercel server deployment.
