import { PrismaClient } from '@prisma/client';

export const postPrisma = new PrismaClient().$extends({
  result: {
    user: {
      fullName: {
        needs: { firstName: true, lastName: true },
        compute(user: { firstName: any; lastName: any }) {
          return `${user.firstName} ${user.lastName}`;
        },
      },
      image: {
        needs: { image: true },
        compute(user: { image: string }) {
          if (user.image) {
            return '/optimize/' + user.image.split('.')[0] + '.webp';
          }
          return user.image;
        },
      },
    },

    post: {
      image: {
        needs: { image: true },
        compute(post: { image: string }) {
          return '/optimize/' + post.image.split('.')[0] + '.webp';
        },
      },
      updatedAt: {
        needs: { updatedAt: true },
        compute(post: {
          updatedAt: {
            toLocaleDateString: (
              arg0: string,
              arg1: { year: string; month: string; day: string }
            ) => any;
          };
        }) {
          return post.updatedAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        },
      },
    },
  },
});
