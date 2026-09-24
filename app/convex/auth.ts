import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { anonymous } from 'better-auth/plugins'
import authConfig from './auth.config'
import { components, internal } from './_generated/api'
import { query } from './_generated/server'
import { requireActionCtx } from '@convex-dev/better-auth/utils'
import { APIError } from 'better-auth/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'
import { isSellerEmail } from './lib/config'

// =============================================================================
// Environment Variable Helpers
// =============================================================================

const REQUIRED_ENV_VARS = ['SITE_URL'] as const

/**
 * Check for missing env vars and log a helpful warning.
 * Google OAuth is optional so anonymous demo features work out of the box.
 */
function getEnvConfig() {
  const siteUrl = process.env.SITE_URL
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET

  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name])

  if (missing.length > 0) {
    console.warn(
      `⚠️  MISSING CONVEX ENV VARS: ${missing.join(', ')}. Set with: npx convex env set <VAR> "value" or use Convex Dashboard → Settings → Environment Variables`
    )
  }

  const hasGoogleConfig = Boolean(googleClientId && googleClientSecret)

  return {
    siteUrl: siteUrl || 'https://placeholder.convex.site',
    googleClientId,
    googleClientSecret,
    hasGoogleConfig,
  }
}

// Get env config (warns if missing, uses placeholders to allow push)
const envConfig = getEnvConfig()

// Component client for Convex + Better Auth integration
export const authComponent = createClient<DataModel>(components.betterAuth)

// Create Better Auth instance with Convex adapter
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: envConfig.siteUrl,
    trustedOrigins: [envConfig.siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: false },
    user: {
      deleteUser: {
        enabled: true,
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 100,
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip'],
      },
    },
    socialProviders: envConfig.hasGoogleConfig
      ? {
          google: {
            clientId: envConfig.googleClientId!,
            clientSecret: envConfig.googleClientSecret!,
            mapProfileToUser: (profile) => {
              if (!profile.email_verified || !isSellerEmail(profile.email)) {
                throw new APIError('FORBIDDEN', {
                  message: 'Ez a Google-fiók nem használhatja a Tovább alkalmazást.',
                })
              }
              return {}
            },
          },
        }
      : {},
    plugins: [
      anonymous({
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await requireActionCtx(ctx).runMutation(internal.items.transferOwnership, {
            fromOwnerId: anonymousUser.user.id,
            toOwnerId: newUser.user.id,
          })
        },
      }),
      convex({ authConfig }),
    ],
  })
}

// Query to get the current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})
