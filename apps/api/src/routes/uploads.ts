import { Router } from 'express';
import multer from 'multer';
import { authorize, restaurantIdOf } from '../middleware/auth';
import { HttpError } from '../utils/HttpError';
import { IMAGE_TYPES, looksLikeImage, storageConfigured, uploadImage } from '../utils/storage';

// Mounted at /api/restaurants/:restaurantId/uploads
const router = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.post('/menu-image', authorize('superadmin', 'admin'), upload.single('file'), async (req, res) => {
  if (!storageConfigured) {
    throw new HttpError(503, 'Image uploads aren’t set up yet. Add the R2_* variables to the API.');
  }
  const file = req.file;
  if (!file) throw new HttpError(400, 'Choose an image to upload');
  if (!IMAGE_TYPES[file.mimetype] || !looksLikeImage(file.buffer, file.mimetype)) {
    throw new HttpError(400, 'Use a JPG, PNG or WebP image');
  }

  const url = await uploadImage(`restaurants/${restaurantIdOf(req)}/menu`, file.buffer, file.mimetype);
  res.status(201).json({ url });
});

export default router;
