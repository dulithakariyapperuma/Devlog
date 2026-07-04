import { PrismaClient, OrgRole, TeamRole } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Creating default organization...");
  const org = await prisma.organization.upsert({
    where: { slug: 'devlog-hq' },
    update: {},
    create: {
      name: 'DevLog HQ',
      slug: 'devlog-hq',
    }
  });
  console.log("Org ID:", org.id);

  // Add all existing teams to the organization
  const teams = await prisma.team.findMany();
  for (const team of teams) {
    if (!team.organizationId) {
      await prisma.team.update({
        where: { id: team.id },
        data: { organizationId: org.id }
      });
      console.log(`Updated team ${team.name} with orgId`);
    }
  }

  // Add all users to the organization as ORG_MEMBER, except SUPER_ADMIN
  const users = await prisma.user.findMany();
  for (const user of users) {
    const role = user.globalRole === 'SUPER_ADMIN' ? OrgRole.SUPER_ADMIN : OrgRole.ORG_MEMBER;
    await prisma.orgMembership.upsert({
      where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
      update: { role },
      create: { organizationId: org.id, userId: user.id, role }
    });
    console.log(`Added user ${user.email} to org with role ${role}`);
    
    if (user.globalRole === 'SUPER_ADMIN') {
        // give them access to teams if they didn't have it
        for(const t of teams) {
            await prisma.teamMembership.upsert({
                where: { teamId_userId: { teamId: t.id, userId: user.id } },
                update: { role: TeamRole.TEAM_ADMIN },
                create: { teamId: t.id, userId: user.id, role: TeamRole.TEAM_ADMIN }
            })
        }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
