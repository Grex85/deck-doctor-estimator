import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  jobMedia: f({
    image: { 
      maxFileSize: "8MB", 
      maxFileCount: 10 
    },
    video: { 
      maxFileSize: "32MB", 
      maxFileCount: 5 
    }
  })
    .middleware(async ({ req }) => {
      return { 
        userId: "temp-user"
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete!");
      console.log("File URL:", file.url);
      
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name
      }; 
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;