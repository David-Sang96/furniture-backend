import { PrismaClient } from '@prisma/client';

export const productPrisma = new PrismaClient().$extends({
  result: {
    image: {
      path: {
        needs: { path: true },
        compute(image) {
          return `/optimize/${image.path.split('.')[0]}.webp`;
        },
      },
    },
  },
});
