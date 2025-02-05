import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received upload request with body:', body);

    const { path } = body;

    if (!path) {
      console.error('No path provided in request');
      return new Response('Path is required', { status: 400 });
    }

    console.log('Attempting to upload file from path:', path);

    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      transformation: [{ width: 1000, height: 752, crop: "scale" }],
      folder: 'imaginify',
      resource_type: "auto", // 自动检测资源类型
      allowed_formats: ["jpg", "png", "gif", "webp", "jpeg"], // 允许的文件格式
    };

    try {
      // 如果是 base64 图片数据
      if (path.startsWith('data:')) {
        const result = await cloudinary.uploader.upload(path, {
          ...options,
          resource_type: "auto"
        });
        console.log('Cloudinary upload successful:', result);
        return NextResponse.json({
          public_id: result.public_id,
          secure_url: result.secure_url,
          width: result.width,
          height: result.height,
        }, { status: 200 });
      }

      // 如果是 URL
      const result = await cloudinary.uploader.upload(path, options);
      console.log('Cloudinary upload successful:', result);

      return NextResponse.json({
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
      }, { status: 200 });

    } catch (uploadError: any) {
      console.error('Cloudinary upload error:', {
        message: uploadError.message,
        details: uploadError
      });

      return new Response(
        `Error uploading to Cloudinary: ${uploadError.message}`, 
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General error in upload route:', error);
    return new Response(
      `Internal Server Error: ${error.message}`, 
      { status: 500 }
    );
  }
}

// 增加允许的请求体大小
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // 增加大小限制
    },
  },
}; 