import { NextRequest, NextResponse } from 'next/server';
import { detectCSScript, executeCSScript, executeCSScriptFile } from '@/lib/cs-script';

/**
 * GET /api/cs-script
 * Check if CS-Script is installed and get version info
 */
export async function GET() {
  try {
    const info = await detectCSScript();
    return NextResponse.json(info);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to detect CS-Script' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cs-script
 * Execute a C# script
 * 
 * Body:
 * - code: string (C# code to execute)
 * - filePath: string (path to .cs file to execute)
 * 
 * One of code or filePath must be provided
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, filePath } = body;
    
    if (!code && !filePath) {
      return NextResponse.json(
        { error: 'Either code or filePath must be provided' },
        { status: 400 }
      );
    }
    
    // Check if CS-Script is installed
    const info = await detectCSScript();
    if (!info.installed) {
      return NextResponse.json(
        { error: 'CS-Script is not installed. Run: dotnet tool install --global cs-script.cli' },
        { status: 503 }
      );
    }
    
    // Execute the script
    const result = code 
      ? await executeCSScript(code)
      : await executeCSScriptFile(filePath);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to execute script' },
      { status: 500 }
    );
  }
}
