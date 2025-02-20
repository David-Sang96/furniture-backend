import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { prisma } from '../src/config/prisma';

function createRandomUser() {
  return {
    password: '',
    phone: faker.phone.number({ style: 'international' }),
    refreshToken: faker.internet.jwt(),
  };
}

const users = faker.helpers.multiple(createRandomUser, {
  count: 5,
});

async function seeding() {
  console.log('Start seeding...');
  const salt = await bcrypt.genSalt(10);
  const hashPassword = await bcrypt.hash('12345678', salt);

  for (const user of users) {
    user.password = hashPassword;
    await prisma.user.create({ data: user });
  }

  console.log('Finish seeding...');
}

seeding()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    console.log(err);
    process.exit(1);
  });
