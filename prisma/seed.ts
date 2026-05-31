// prisma/seed.ts
// Run: npm run db:seed

import { PrismaClient, Plan } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Vyral database…')

  // Demo user
  const user = await db.user.upsert({
    where: { email: 'demo@vyral.in' },
    update: {},
    create: {
      name:     'Riya Kapoor',
      email:    'demo@vyral.in',
      username: 'riyakapoor',
      bio:      'SaaS founder | Building in Bharat 🇮🇳 | Bootstrapped & profitable',
      location: 'Bangalore, Karnataka',
      plan:     Plan.PRO,
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  // Workspace
  const workspace = await db.workspace.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name:   'Riya\'s Creator Studio',
    },
  })

  // AI credits
  await db.aiCredit.create({
    data: {
      userId:  user.id,
      amount:  2000,
      reason:  'plan_monthly',
      balance: 2000,
    },
  })

  // Sample social accounts
  const platforms = [
    { platform: 'INSTAGRAM' as const, platformUserId: 'ig_123', platformUsername: 'riya.kapoor.builds' },
    { platform: 'LINKEDIN'  as const, platformUserId: 'li_456', platformUsername: 'riya-kapoor-saas' },
    { platform: 'TWITTER'   as const, platformUserId: 'tw_789', platformUsername: 'riyabuilds' },
  ]

  for (const p of platforms) {
    await db.socialAccount.upsert({
      where: { workspaceId_platform: { workspaceId: workspace.id, platform: p.platform } },
      update: {},
      create: {
        workspaceId:      workspace.id,
        accessToken:      'demo_token_' + p.platform.toLowerCase(),
        scopes:           ['read', 'write'],
        ...p,
      },
    })
  }

  console.log('✅ Seed complete')
  console.log(`   User: ${user.email}`)
  console.log(`   Workspace: ${workspace.name}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
