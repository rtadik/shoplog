// OLE blob → real image extractor.
//
// Access OLE Object fields are wrapped binary objects. The blob can contain:
//   1. A "Picture" / OLE preamble followed by JPEG or PNG bytes.
//   2. A DIB / Bitmap structure (BITMAPINFOHEADER + pixel data).
//   3. An OLE Package containing nested image bytes.
//   4. Plain JPEG/PNG bytes with no wrapper.
//
// We use multiple detection paths, in order. If extraction succeeds we return
// the recovered image bytes + a guessed extension. If it fails, we return
// `null` and the caller persists the raw blob for later recovery via the
// in-app Photo Recovery utility.

const JPEG_SOI = Buffer.from([0xff, 0xd8, 0xff]);
const JPEG_EOI = Buffer.from([0xff, 0xd9]);
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IEND = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
const GIF_SIG_87 = Buffer.from('GIF87a');
const GIF_SIG_89 = Buffer.from('GIF89a');

export interface ExtractedImage {
  bytes: Buffer;
  ext: 'jpg' | 'png' | 'bmp' | 'gif';
}

export interface ExtractionResult {
  ok: boolean;
  image?: ExtractedImage;
  /** Description of which path succeeded (for diagnostics) */
  via?: string;
  /** Description of why it failed */
  reason?: string;
}

export function extractImageFromOle(blob: Buffer): ExtractionResult {
  if (!blob || blob.length === 0) {
    return { ok: false, reason: 'empty blob' };
  }

  // Path 1: scan for raw JPEG signature anywhere in the blob.
  const jpgIdx = blob.indexOf(JPEG_SOI);
  if (jpgIdx >= 0) {
    const eoi = blob.indexOf(JPEG_EOI, jpgIdx + 3);
    if (eoi > jpgIdx) {
      return {
        ok: true,
        via: jpgIdx === 0 ? 'jpeg-raw' : 'jpeg-embedded',
        image: { bytes: blob.subarray(jpgIdx, eoi + 2), ext: 'jpg' },
      };
    }
    // Take from SOI to end as fallback (some files lack EOI).
    return {
      ok: true,
      via: 'jpeg-noeoi',
      image: { bytes: blob.subarray(jpgIdx), ext: 'jpg' },
    };
  }

  // Path 2: scan for PNG signature.
  const pngIdx = blob.indexOf(PNG_SIG);
  if (pngIdx >= 0) {
    const iend = blob.indexOf(PNG_IEND, pngIdx + PNG_SIG.length);
    if (iend > pngIdx) {
      return {
        ok: true,
        via: pngIdx === 0 ? 'png-raw' : 'png-embedded',
        image: { bytes: blob.subarray(pngIdx, iend + PNG_IEND.length), ext: 'png' },
      };
    }
    return {
      ok: true,
      via: 'png-noiend',
      image: { bytes: blob.subarray(pngIdx), ext: 'png' },
    };
  }

  // Path 3: GIF signature.
  const gifIdx = Math.max(blob.indexOf(GIF_SIG_87), blob.indexOf(GIF_SIG_89));
  if (gifIdx >= 0) {
    return {
      ok: true,
      via: 'gif',
      image: { bytes: blob.subarray(gifIdx), ext: 'gif' },
    };
  }

  // Path 4: BMP — direct ('BM' header at start) or DIB (BITMAPINFOHEADER without 14-byte file header).
  if (blob[0] === 0x42 && blob[1] === 0x4d) {
    return {
      ok: true,
      via: 'bmp-raw',
      image: { bytes: blob, ext: 'bmp' },
    };
  }

  // Detect a DIB by hunting for a plausible BITMAPINFOHEADER (40-byte size at offset N).
  // Access OLE wraps DIBs after a textual preamble like "Picture" + DIB.
  // Strategy: search for the 40-byte BITMAPINFOHEADER signature (uint32 0x28000000)
  // at any offset, validate width/height, then synthesize a BMP file header.
  const dibBmp = tryReconstructBmpFromDib(blob);
  if (dibBmp) {
    return {
      ok: true,
      via: 'dib-reconstructed',
      image: { bytes: dibBmp, ext: 'bmp' },
    };
  }

  return {
    ok: false,
    reason: 'no recognizable image signature found',
  };
}

/**
 * Reconstruct a BMP file by finding a BITMAPINFOHEADER (40 bytes) embedded
 * in the blob and prepending a 14-byte BITMAPFILEHEADER.
 */
function tryReconstructBmpFromDib(blob: Buffer): Buffer | null {
  // BITMAPINFOHEADER size = 40, stored little-endian as the first 4 bytes.
  const target = Buffer.from([0x28, 0x00, 0x00, 0x00]);
  for (let i = 0; i + 40 < blob.length; i++) {
    if (blob[i] !== target[0]) continue;
    if (
      blob[i + 1] !== target[1] ||
      blob[i + 2] !== target[2] ||
      blob[i + 3] !== target[3]
    ) {
      continue;
    }
    const width = blob.readInt32LE(i + 4);
    const height = blob.readInt32LE(i + 8);
    const planes = blob.readUInt16LE(i + 12);
    const bpp = blob.readUInt16LE(i + 14);
    if (planes !== 1) continue;
    if (![1, 4, 8, 16, 24, 32].includes(bpp)) continue;
    if (Math.abs(width) > 20000 || Math.abs(height) > 20000) continue;
    if (width === 0 || height === 0) continue;

    // Slice from this DIB header onward — that's our pixel-data region.
    const dib = blob.subarray(i);
    const fileSize = 14 + dib.length;
    const pixelOffset = 14 + 40 + colorTableSize(bpp) * 4;

    const fileHeader = Buffer.alloc(14);
    fileHeader[0] = 0x42; // 'B'
    fileHeader[1] = 0x4d; // 'M'
    fileHeader.writeUInt32LE(fileSize, 2);
    fileHeader.writeUInt16LE(0, 6);
    fileHeader.writeUInt16LE(0, 8);
    fileHeader.writeUInt32LE(pixelOffset, 10);

    return Buffer.concat([fileHeader, dib]);
  }
  return null;
}

function colorTableSize(bpp: number): number {
  if (bpp <= 8) return 1 << bpp;
  return 0;
}
