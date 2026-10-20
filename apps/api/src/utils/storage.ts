import { randomUUID } from 'crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../config/env';

const { r2 } = env;

export const storageConfigured = Boolean(
  r2.accountId && r2.accessKeyId && r2.secretAccessKey && r2.bucket && r2.publicUrl,
);

const client = storageConfigured
  ? new S3Client({
      region: 'auto',
      endpoint: r2.endpoint || `https://${r2.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(r2.endpoint),
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    })
  : null;

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Checks the file's leading bytes, so a renamed non-image can't pass as one. */
export function looksLikeImage(body: Buffer, contentType: string): boolean {
  switch (contentType) {
    case 'image/jpeg':
      return body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff;
    case 'image/png':
      return body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP';
    default:
      return false;
  }
}

/** Stores an image under `prefix/` and returns its public URL. */
export async function uploadImage(prefix: string, body: Buffer, contentType: string): Promise<string> {
  const key = `${prefix}/${randomUUID()}.${IMAGE_TYPES[contentType]}`;
  await client!.send(
    new PutObjectCommand({
      Bucket: r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return `${r2.publicUrl}/${key}`;
}

/** Best-effort delete of an image we previously uploaded; ignores foreign URLs and failures. */
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!client || !url || !url.startsWith(`${r2.publicUrl}/`)) return;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: url.slice(r2.publicUrl.length + 1) }));
  } catch (err) {
    console.warn('Could not delete image', url, err);
  }
}
