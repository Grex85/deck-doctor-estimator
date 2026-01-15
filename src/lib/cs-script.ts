import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export interface CSScriptResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

export interface CSScriptInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

/**
 * Detect if CS-Script is installed and get version info
 */
export async function detectCSScript(): Promise<CSScriptInfo> {
  try {
    const { stdout } = await execAsync('css --version', {
      env: { ...process.env, PATH: `${process.env.PATH}:/Users/garrett/.dotnet/tools` }
    });
    
    const version = stdout.trim();
    
    // Get the path to css
    const { stdout: whichOutput } = await execAsync('which css', {
      env: { ...process.env, PATH: `${process.env.PATH}:/Users/garrett/.dotnet/tools` }
    });
    
    return {
      installed: true,
      version,
      path: whichOutput.trim()
    };
  } catch {
    return {
      installed: false
    };
  }
}

/**
 * Execute a C# script string
 */
export async function executeCSScript(code: string): Promise<CSScriptResult> {
  const startTime = Date.now();
  const tempFile = join(tmpdir(), `cs-script-${Date.now()}.cs`);
  
  try {
    // Ensure the code has the necessary using statements
    const fullCode = code.includes('using System') ? code : `using System;\n${code}`;
    
    // Write the script to a temp file
    await writeFile(tempFile, fullCode, 'utf-8');
    
    // Execute the script
    const { stdout, stderr } = await execAsync(`css "${tempFile}"`, {
      env: { ...process.env, PATH: `${process.env.PATH}:/Users/garrett/.dotnet/tools` },
      timeout: 30000 // 30 second timeout
    });
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      executionTime
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      output: '',
      error: error.message || 'Unknown error occurred',
      executionTime
    };
  } finally {
    // Clean up temp file
    try {
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Execute a C# script file
 */
export async function executeCSScriptFile(filePath: string): Promise<CSScriptResult> {
  const startTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(`css "${filePath}"`, {
      env: { ...process.env, PATH: `${process.env.PATH}:/Users/garrett/.dotnet/tools` },
      timeout: 30000
    });
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      output: stdout,
      error: stderr || undefined,
      executionTime
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      output: '',
      error: error.message || 'Unknown error occurred',
      executionTime
    };
  }
}
