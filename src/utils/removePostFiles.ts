import { unlink } from 'fs/promises';
import path from 'path';

export const removePostFiles = async (
  originalFile: string,
  optimizedFile: string | null
) => {
  try {
    const originalFilePath = path.join(
      __dirname,
      '../../',
      'upload/images',
      originalFile
    );
    await unlink(originalFilePath);

    if (optimizedFile) {
      const optimizeFilePath = path.join(
        __dirname,
        '../../',
        'upload/optimize',
        optimizedFile
      );
      await unlink(optimizeFilePath);
    }
  } catch (error) {
    console.log(error);
  }
};
