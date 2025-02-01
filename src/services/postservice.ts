import { CreatePost } from '../types/postTypes';
import { prisma } from '../utils/prisma';

export const createOnePost = (postData: CreatePost) => {
  const data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
    image: postData.image,
    user: { connect: { id: postData.userId } },
    // one to many relation
    category: {
      connectOrCreate: {
        where: { name: postData.category },
        create: { name: postData.category },
      },
    },
    // one to many relation
    type: {
      connectOrCreate: {
        where: { name: postData.type },
        create: { name: postData.type },
      },
    },
  };

  // connectOrCreate uses for, If data doesn’t exist → Prisma creates it first, then connects it but If exists → Prisma connects it to the existing.
  if (postData.tags && postData.tags.length > 0) {
    // many to many relation
    data.tags = {
      connectOrCreate: postData.tags.map((tagName) => ({
        where: { name: tagName },
        create: { name: tagName },
      })),
    };
  }

  return prisma.post.create({
    data,
  });
};
