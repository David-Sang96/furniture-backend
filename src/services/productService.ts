import { productPrisma } from './productPrismaClient';

export const createOneProduct = (productData: any) => {
  const data: any = {
    name: productData.name,
    description: productData.description,
    price: productData.price,
    discount: productData.discount,
    inventory: productData.inventory,
    rating: productData.rating,
    category: {
      connectOrCreate: {
        where: { name: productData.category },
        create: { name: productData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: productData.type },
        create: { name: productData.type },
      },
    },
    images: { create: productData.images },
  };

  if (productData.tags && productData.tags.length > 0) {
    data.tags = {
      connectOrCreate: productData.tags.map((tagName: string) => ({
        where: { name: tagName },
        create: { name: tagName },
      })),
    };
  }

  return productPrisma.product.create({ data });
};

export const updateOneProduct = (productData: any) => {
  const data: any = {
    name: productData.name,
    description: productData.description,
    price: productData.price,
    discount: productData.discount,
    inventory: productData.inventory,
    rating: productData.rating,
    category: {
      connectOrCreate: {
        where: { name: productData.category },
        create: { name: productData.category },
      },
    },
    type: {
      connectOrCreate: {
        where: { name: productData.type },
        create: { name: productData.type },
      },
    },
  };

  if (productData.tags && productData.tags.length > 0) {
    data.tags = {
      set: [],
      connectOrCreate: productData.tags.map((tagName: string) => ({
        where: { name: tagName.trim() },
        create: { name: tagName.trim() },
      })),
    };
  }

  if (productData.images && productData.images.length > 0) {
    data.images = {
      // set: productData.images.map((img) => ({ id: img.id })), Replace with existing images
      deleteMany: {}, // Deletes all related images
      create: productData.images, // Adds new images
    };
  }

  return productPrisma.product.update({
    where: { id: productData.productId },
    data,
  });
};

export const deleteOneProduct = (id: number) => {
  return productPrisma.product.delete({ where: { id } });
};

export const getProductById = (id: number) => {
  return productPrisma.product.findUnique({
    where: { id },
    include: { images: true },
  });
};

export const getProductWithRelations = (id: number) => {
  return productPrisma.product.findUnique({
    where: { id },
    omit: { categoryId: true, typeId: true, createdAt: true, updatedAt: true },
    include: {
      images: {
        select: { id: true, path: true },
      },
    },
  });
};

export const getAllProducts = (options: any) => {
  return productPrisma.product.findMany(options);
};

export const getCategories = () => {
  return productPrisma.category.findMany();
};

export const getTypes = () => {
  return productPrisma.type.findMany();
};
