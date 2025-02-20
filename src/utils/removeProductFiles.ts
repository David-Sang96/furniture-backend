import { unlink } from 'fs/promises';
import path from 'path';

export const removeProductFiles = async (
  originalFileNames: string[],
  optimizedFileNames: string[] | null
) => {
  try {
    for (const file of originalFileNames) {
      const filePath = path.join(__dirname, '../..', '/upload/images', file);
      await unlink(filePath);
    }

    if (optimizedFileNames) {
      for (const file of optimizedFileNames) {
        const filePath = path.join(
          __dirname,
          '../..',
          '/upload/optimize',
          file
        );
        await unlink(filePath);
      }
    }
  } catch (error) {
    console.log(error);
  }
};
