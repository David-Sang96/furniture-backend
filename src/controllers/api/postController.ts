import { NextFunction, Request, Response } from 'express';
import { param, query } from 'express-validator';
import { getUserById } from '../../services/authService';
import {
  getAllPosts,
  getSinglePostWithRelations,
} from '../../services/postservice';
import { checkUserNotExist } from '../../utils/auth';
import { getOrSetCache } from '../../utils/cache';
import { checkModelExisted } from '../../utils/check';
import { handleValidationResult } from '../../utils/errorHandler';

export const getSinglePost = [
  param('id', 'Post Id is required').isInt({ gt: 0 }),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const postId = req.params.id;
    const userId = req.userId;

    const user = await getUserById(userId!);
    checkUserNotExist(user);

    // const post = await getSinglePostWithRelations(+postId);
    // checkModelExisted(post);

    const cacheKey = `posts:${JSON.stringify(postId)}`;
    const post = await getOrSetCache(cacheKey, async () => {
      return await getSinglePostWithRelations(+postId);
    });
    checkModelExisted(post);

    // const modifiedPostData = {
    //   id: post?.id,
    //   title: post?.title,
    //   content: post?.content,
    //   body: post?.body,
    //   image: '/optimize/' + post?.image.split('.')[0] + '.webp',
    //   updatedAt: post?.updatedAt.toLocaleDateString('en-US', {
    //     year: 'numeric',
    //     month: 'long',
    //     day: 'numeric',
    //   }),
    //   fullName:
    //     (post?.user.firstName ?? '') + ' ' + (post?.user.lastName ?? ''),
    //   category: post?.category.name,
    //   type: post?.category.name,
    //   tags:
    //     post?.tags && post.tags.length > 0
    // ? post?.tags.map((tag) => tag.name).join(',')
    //       : null,
    // };

    res.json({ message: 'Post Detail', post });
  },
];

// offset pagniation
export const getPostsByPagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Limit must be at least 5.'),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserNotExist(user);

    const skip = (page - 1) * limit;
    const options = {
      skip,
      take: limit + 1,
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        updatedAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    };

    // const posts = await getAllPosts(options);
    const cacheKey = `posts:${JSON.stringify(req.query)}`;
    const posts = await getOrSetCache(cacheKey, async () => {
      return await getAllPosts(options);
    });
    const hasNextPage = posts.length > limit;
    const previousPage = page !== 1 ? page - 1 : null;
    let nextPage = null;

    if (hasNextPage) {
      posts.pop();
      nextPage = page + 1;
    }

    res.json({
      message: 'Get all offset posts',
      currentPage: page,
      nextPage,
      previousPage,
      posts,
    });
  },
];

// cursor-based pagniation
export const getInfinitePostsByPagination = [
  query('cursor')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cursor must be a positive integer.'),
  query('limit')
    .optional()
    .isInt({ gt: 2 })
    .withMessage('Limit must be at least 5.'),
  async (req: Request, res: Response, next: NextFunction) => {
    handleValidationResult(req);
    const lastCursor = Number(req.query.cursor);
    const limit = Number(req.query.limit) || 5;
    const userId = req.userId;
    const user = await getUserById(userId!);
    checkUserNotExist(user);

    const options = {
      take: limit + 1,
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        title: true,
        content: true,
        image: true,
        updatedAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    };
    // const posts = await getAllPosts(options);
    const cacheKey = `posts:${JSON.stringify(req.query)}`;
    const posts = await getOrSetCache(cacheKey, async () => {
      return await getAllPosts(options);
    });
    const hasNextPage = posts.length > limit;

    if (hasNextPage) {
      posts.pop();
    }

    const nextCursor = posts.length > 0 ? posts[posts.length - 1].id : null;

    res.json({
      message: 'Get all inifnite posts',
      hasNextPage,
      nextCursor,
      prevCursor: lastCursor,
      posts,
    });
  },
];
