import { PostDataTypes } from '../types/postTypes';
import { prisma } from './prismaClient';

export const createOnePost = (postData: PostDataTypes) => {
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
        where: { name: tagName.trim() },
        create: { name: tagName.trim() },
      })),
    };
  }

  return prisma.post.create({
    data,
  });
};

export const updateOnePost = (id: number, postData: PostDataTypes) => {
  const data: any = {
    title: postData.title,
    content: postData.content,
    body: postData.body,
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

  if (postData.tags && postData.tags.length > 0) {
    // many to many relation
    data.tags = {
      connectOrCreate: postData.tags.map((tagName) => ({
        where: { name: tagName },
        create: { name: tagName },
      })),
    };
  }

  if (postData.image) data.image = postData.image;

  return prisma.post.update({ where: { id }, data });
};

export const deleteOnePost = (id: number) => {
  return prisma.post.delete({ where: { id } });
};

export const getPostById = (id: number) => {
  return prisma.post.findUnique({ where: { id } });
};

export const getSinglePostWithRelations = (id: number) => {
  const postSelection = {
    id: true,
    title: true,
    body: true,
    content: true,
    image: true,
    updatedAt: true,
    user: { select: { /*firstName: true, lastName: true, */ fullName: true } },
    category: { select: { name: true } },
    type: { select: { name: true } },
    tags: { select: { name: true } },
  };

  return prisma.post.findUnique({
    where: { id },
    select: postSelection,
  });
};

export const getAllPosts = (options: any) => {
  return prisma.post.findMany(options);
};
