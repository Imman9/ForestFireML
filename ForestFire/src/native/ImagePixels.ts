import { NativeModules } from 'react-native';

const Native = NativeModules.ImagePixels;

/**
 * Returns a Uint8Array of RGBA pixels for an image at uri, with size width*height*4
 * (output shape is [height][width][4], row-major flat array, RGBA8888)
 */
export async function getRgbaBytes(uri: string, width: number, height: number): Promise<Uint8Array> {
  if (!Native) throw new Error('ImagePixels native module not found');
  const base64: string = await Native.getRgbaBytes(uri, width, height);
  // atob for RN (atob shim or Buffer)
  const binary = Buffer.from(base64, 'base64');
  return new Uint8Array(binary);
}

