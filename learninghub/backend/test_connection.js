const { prisma } = require('./dist/prismaClient.js');
console.log('Prisma client loaded');
prisma.$connect()
  .then(() => {
    console.log('Connected to DB');
    return prisma.user.count();
  })
  .then(count => {
    console.log('User count:', count);
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
