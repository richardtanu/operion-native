import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { apiRequest } from './client';
import { ApiError } from './httpError';
import type { CreateUploadRequest, UploadPurpose, UploadTicketResponse, UploadViewResponse } from './types';

/** Long edge after resizing — enough to read a label on a box, ~200–400 KB as JPEG (BE-23). */
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.7;

export function createUpload(request: CreateUploadRequest, token: string): Promise<UploadTicketResponse> {
  return apiRequest<UploadTicketResponse>('/uploads', { method: 'POST', body: request, token });
}

/** A 5-minute link to view an upload the caller may see. */
export function viewUpload(id: string, token: string): Promise<UploadViewResponse> {
  return apiRequest<UploadViewResponse>(`/uploads/${id}`, { token });
}

/**
 * Shrinks a photo, asks the backend for a signed upload link, and PUTs the
 * file straight to storage (BE-23: the API server never carries the bytes).
 * Returns the upload id to send with the record (e.g. a goods receipt).
 *
 * Content-Type and size are signed into the link, so the bytes PUT must be
 * exactly the ones declared — that's why size is measured after resizing.
 * Throws ApiError with the server's message; a 503 means R2 isn't set up yet.
 */
export async function uploadPhoto(uri: string, width: number, height: number, purpose: UploadPurpose, token: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  const blob = await (await fetch(saved.uri)).blob();
  const ticket = await createUpload({ purpose, contentType: 'image/jpeg', sizeBytes: blob.size }, token);

  const put = await fetch(ticket.putUrl, { method: ticket.method || 'PUT', headers: ticket.headers, body: blob });
  if (!put.ok) {
    throw new ApiError(put.status, 'The photo could not be stored. Try again.', null);
  }
  return ticket.uploadId;
}

/** Friendly wording for upload failures, in the app's voice. */
export function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 503) {
    return 'Photo uploads aren’t set up on the server yet. Ask HQ to finish the storage setup.';
  }
  return err instanceof ApiError ? err.message : 'The photo could not be uploaded. Check the connection and try again.';
}
