import { createUploadthing, type FileRouter } from 'uploadthing/next';

const f = createUploadthing();

export const ourFileRouter = {
  jobMedia: f({
    image: {
      maxFileSize: '8MB',
      maxFileCount: 10,
    },
    video: {
      maxFileSize: '32MB',
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      return {
        userId: 'temp-user',
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log('Upload complete!');
      console.log('File URL:', file.url);

      return {
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
