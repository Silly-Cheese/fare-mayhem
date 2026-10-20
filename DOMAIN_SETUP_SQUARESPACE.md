# Fare Mayhem — connect fare-mayhem.com

**Official address:** https://fare-mayhem.com/ (without www). The site uses GitHub Actions for GitHub Pages. Firebase stays on the existing `fare-mayhem` project.

## 1. Save your custom domain in GitHub Pages FIRST
1. Open https://github.com/Silly-Cheese/fare-mayhem/settings/pages .
2. Keep **Build and deployment → Source: GitHub Actions**.
3. Set **Custom domain** to `fare-mayhem.com` and click **Save**.
4. GitHub recommends verifying domain ownership to prevent takeovers; follow GitHub's domain-verification prompts and enter the supplied TXT record at Squarespace if requested.

**Important:** A repository `CNAME` file is ignored for sites deployed by GitHub Actions, so the Pages Settings action above is required even if DNS already points at GitHub. Configure GitHub before DNS to avoid possible domain takeover.

## 2. Squarespace DNS records
In Squarespace Domains → fare-mayhem.com → DNS settings, add:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | `185.199.108.153` |
| A | @ | `185.199.109.153` |
| A | @ | `185.199.110.153` |
| A | @ | `185.199.111.153` |
| CNAME | www | `silly-cheese.github.io` |

The **www CNAME** must point directly to `silly-cheese.github.io`, not `silly-cheese.github.io/fare-mayhem/` and not `fare-mayhem.com`. GitHub can redirect www to your preferred apex URL.

Replace only conflicting website A/AAAA/CNAME records. Preserve unrelated email, SPF, DKIM, and account verification records. Do not create wildcard DNS entries.

GitHub's official reference: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site .

## 3. Enforce HTTPS
After DNS resolves and GitHub issues a TLS certificate, return to https://github.com/Silly-Cheese/fare-mayhem/settings/pages and turn on **Enforce HTTPS**. It can take some time, sometimes up to 24 hours.

## 4. Add the hostname to Firebase Authentication
Open https://console.firebase.google.com/project/fare-mayhem/authentication/settings and find **Authorized domains**.

Add `fare-mayhem.com` without https or a slash. You can also add `www.fare-mayhem.com` if visitors will sign in there before being redirected. Keep `silly-cheese.github.io` authorized during the transition, if applicable.

**Do not change** `authDomain: 'fare-mayhem.firebaseapp.com'` in `src/firebase.ts`. GitHub Pages does not provide the Firebase-hosted `/__/auth/` endpoints that Google sign-in uses. No Firestore rules, Storage rules, or Cloud Functions redeployment is required solely for moving the website URL.

## 5. Test before public launch
- Open `https://fare-mayhem.com/` in a private browsing tab and check layout and card images.
- Check `https://www.fare-mayhem.com/` redirects to your preferred HTTPS URL.
- Sign in with email/password and **Continue with Google**, verify Card Studio owner recognition and collections.
- Test secure practice and PvP from the new origin.
- Open and install the PWA at the **new** HTTPS domain. Apps installed from the old github.io origin do not automatically relocate; reinstall if needed.
- Check `https://fare-mayhem.com/robots.txt`, `/sitemap.xml`, and a nonexistent path for the custom 404.
- If DNS seems incorrect on Windows, run `Resolve-DnsName fare-mayhem.com -Type A` and `Resolve-DnsName www.fare-mayhem.com -Type CNAME`.

### Transition note
This release changes the Vite base and PWA scope from `/fare-mayhem/` to `/`. Before GitHub Pages' custom-domain setting is saved, the previous project URL may load without its styling or scripts. Configure the GitHub Pages domain promptly after the new website deploys.

Firebase Blaze may still charge for traffic; the custom domain does not add an OpenAI subscription or require migrating existing user accounts.
