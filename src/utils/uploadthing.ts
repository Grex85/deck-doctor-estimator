// src/utils/uploadthing.ts

import {
    generateUploadButton,
    generateUploadDropzone,
  } from "@uploadthing/react";
  
  // Import the type we created in our API
  import type { OurFileRouter } from "@/app/api/uploadthing/core";
  
  // Create the upload components with proper typing
  export const UploadButton = generateUploadButton<OurFileRouter>();
  export const UploadDropzone = generateUploadDropzone<OurFileRouter>();