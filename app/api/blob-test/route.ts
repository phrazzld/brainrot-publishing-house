import { list, put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // List all blobs in the root directory
    const { blobs } = await list();
    
    return NextResponse.json({ blobs });
  } catch (error: Error) {
    console.error('Error listing blobs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file') as File;
    const filename = form.get('filename') as string || file.name;
    const pathname = form.get('pathname') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create full path with any directory structure
    const fullPath = pathname ? `${pathname}/${filename}` : filename;
    
    // Upload to Vercel Blob
    const blob = await put(fullPath, file, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error: Error) {
    console.error('Error uploading to blob storage:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Delete the blob
    await del(url);
    
    return NextResponse.json({ success: true });
  } catch (error: Error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}