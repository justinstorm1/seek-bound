import Apple from "@auth/core/providers/apple";
import Google from "@auth/core/providers/google";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { convexAuth, createAccount, retrieveAccount } from "@convex-dev/auth/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_NATIVE_PROVIDER = "apple-native";
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

/** Only members of this email domain may sign in. */
const ALLOWED_EMAIL_DOMAIN = "njit.edu";

/**
 * Throws unless the email is an `@njit.edu` address (or listed in the
 * `AUTH_ALLOWED_EXTRA_EMAILS` env var — a comma-separated allowlist for dev
 * accounts). The thrown message is surfaced to the client.
 */
function assertAllowedEmail(email: unknown): void {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) return;

  const extra = (process.env.AUTH_ALLOWED_EXTRA_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (normalized && extra.includes(normalized)) return;

  throw new Error(`Sign in with your @${ALLOWED_EMAIL_DOMAIN} account.`);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Apple({
      profile: (appleInfo) => {
        assertAllowedEmail(appleInfo.email);
        const name = appleInfo.user
          ? `${appleInfo.user.name.firstName} ${appleInfo.user.name.lastName}`
          : undefined;
        return {
          id: appleInfo.sub,
          name: name,
          email: appleInfo.email,
        };
      },
    }),
    Google({
      // Nudge Google's account chooser toward NJIT Workspace accounts. Not a
      // hard limit on its own — `assertAllowedEmail` below is the real gate.
      authorization: { params: { hd: ALLOWED_EMAIL_DOMAIN, prompt: "select_account" } },
      profile: (googleInfo) => {
        assertAllowedEmail(googleInfo.email);
        return {
          id: googleInfo.sub,
          name: googleInfo.name,
          email: googleInfo.email,
          image: googleInfo.picture,
        };
      },
    }),
    // Native "Sign in with Apple" (expo-apple-authentication). The client gets an
    // identity token from the OS and passes it here; we verify it against Apple's
    // published keys, then map the Apple subject to a Convex user.
    ConvexCredentials({
      id: APPLE_NATIVE_PROVIDER,
      authorize: async (credentials, ctx) => {
        const identityToken = credentials.identityToken;
        if (typeof identityToken !== "string" || identityToken.length === 0) {
          throw new Error("Missing Apple identity token.");
        }

        const audience = process.env.APPLE_BUNDLE_ID;
        if (!audience) {
          throw new Error("APPLE_BUNDLE_ID is not set on the Convex deployment.");
        }

        const { payload } = await jwtVerify(identityToken, appleJwks, {
          issuer: "https://appleid.apple.com",
          audience,
        });

        const appleId = payload.sub;
        if (!appleId) throw new Error("Apple identity token has no subject.");

        const emailVerified =
          payload.email_verified === true || payload.email_verified === "true";

        const profile: { email?: string; name?: string } = {};
        if (typeof payload.email === "string") profile.email = payload.email;
        if (typeof credentials.fullName === "string" && credentials.fullName.trim()) {
          profile.name = credentials.fullName.trim();
        }

        try {
          const { user } = await retrieveAccount(ctx, {
            provider: APPLE_NATIVE_PROVIDER,
            account: { id: appleId },
          });
          return { userId: user._id };
        } catch {
          assertAllowedEmail(profile.email);
          const { user } = await createAccount(ctx, {
            provider: APPLE_NATIVE_PROVIDER,
            account: { id: appleId },
            profile,
            shouldLinkViaEmail: emailVerified,
          });
          return { userId: user._id };
        }
      },
    }),
  ],
});
