// Check encoded headers before asking the image decoder or GPU to allocate.
// v2 deliberately accepts PNG textures only; geometry JSON has its own budget.
export function texturePixels(bytes) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 24 || !signature.every((v, i) => bytes[i] === v)
    || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') throw Error('invalid_texture_png');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16), height = view.getUint32(20);
  if (view.getUint32(8) !== 13 || !width || !height || width > 2048 || height > 2048) throw Error('texture_pixel_budget');
  return width * height;
}
export async function checkTextureBudget(headUrl, garments, fetchResource = fetch) {
  const urls = [headUrl];
  for (const slot of ['top', 'bottom']) for (const key of ['front', 'back', 'frontBump', 'backBump']) urls.push(garments[slot].assets[key]);
  let total = 0;
  for (const url of urls) {
    const response = await fetchResource(url);
    if (!response.ok) throw Error('texture_resource_unavailable');
    total += texturePixels(new Uint8Array(await response.arrayBuffer()));
    if (total > 8 * 1024 * 1024) throw Error('texture_pixel_budget');
  }
  return total;
}
