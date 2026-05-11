import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export class MediaStore {
  constructor(private readonly dir: string) {}

  async ensureReady(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  /** Save bytes to a new file, return the basename. */
  async writeBytes(bytes: Buffer, ext: string): Promise<string> {
    await this.ensureReady();
    const safeExt = ext.replace(/^\.+/, '').replace(/[^a-z0-9]/gi, '') || 'bin';
    const name = `${crypto.randomUUID()}.${safeExt.toLowerCase()}`;
    await fs.writeFile(path.join(this.dir, name), bytes);
    return name;
  }

  /** Copy an external file in, return the new basename. */
  async copyIn(srcPath: string): Promise<{ filename: string; originalName: string }> {
    await this.ensureReady();
    const ext = path.extname(srcPath).slice(1).toLowerCase() || 'bin';
    const name = `${crypto.randomUUID()}.${ext}`;
    await fs.copyFile(srcPath, path.join(this.dir, name));
    return { filename: name, originalName: path.basename(srcPath) };
  }

  fullPath(filename: string): string {
    return path.join(this.dir, filename);
  }

  async readBytes(filename: string): Promise<Buffer> {
    return fs.readFile(this.fullPath(filename));
  }

  async remove(filename: string): Promise<void> {
    try {
      await fs.unlink(this.fullPath(filename));
    } catch {
      /* ignore */
    }
  }
}
