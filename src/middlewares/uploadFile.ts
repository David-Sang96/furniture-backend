import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'upload/images');
    // const type = file.mimetype.split('/')[0];
    // if (type === 'image') {
    //   cb(null, 'upload/images');
    // } else {
    //   cb(null, 'upload/files');
    // }
  },
  filename(req, file, cb) {
    const extension = file.mimetype.split('/')[1];
    const filename =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + '.' + extension;
    cb(null, filename);
  },
});

const fileFilter = function (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  const fileTypes = ['image/jpeg', 'image/png'];
  if (fileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 },
});

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, // if max file size is 10MB then image optimization is needed
});

export default upload;
