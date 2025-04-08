import { prisma } from '../config/prisma';

export const addFavorite = (userId: number, productId: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: { products: { connect: { id: productId } } },
  });
};

export const removeFavorite = (userId: number, productId: number) => {
  return prisma.user.update({
    where: { id: userId },
    data: { products: { disconnect: { id: productId } } },
  });
};
