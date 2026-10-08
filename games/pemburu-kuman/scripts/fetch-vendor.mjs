// Mengunduh MediaPipe Face Landmarker ke public/assets/vendor/ untuk deteksi mulut di mode gigi.
// Pakai: node scripts/fetch-vendor.mjs   (butuh internet, tanpa dependency)
//
// Sengaja memakai 0.10.35: mulai 1.0.0, @mediapipe/tasks-vision mengirim metrik pemakaian ke Google,
// dan game anak ini tidak boleh mengumpulkan data. Cek ulang hal ini sebelum menaikkan versi.
// Hanya varian SIMD yang disimpan; browser tanpa WebAssembly SIMD otomatis kembali ke deteksi warna.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = '0.10.35';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vendor = path.join(root, 'public/assets/vendor');
const lib = path.join(vendor, `mediapipe-${VERSION}`);
const npm = f => `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/${f}`;

async function get(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

fs.mkdirSync(path.join(lib, 'wasm'), { recursive: true });
const bundle = (await get(npm('vision_bundle.mjs'))).toString('utf8').replace(/\n\/\/# sourceMappingURL=.*\s*$/, '\n');
if(/odml\.pa\.googleapis\.com/.test(bundle)) throw new Error('Versi ini mengirim metrik ke Google, jangan dipakai.');
fs.writeFileSync(path.join(lib, 'vision_bundle.mjs'), bundle);
for(const f of ['wasm/vision_wasm_internal.js', 'wasm/vision_wasm_internal.wasm']) fs.writeFileSync(path.join(lib, f), await get(npm(f)));
fs.writeFileSync(path.join(vendor, 'face_landmarker-f16-v1.task'), await get(MODEL));
console.log(`MediaPipe ${VERSION} + face_landmarker → ${path.relative(process.cwd(), vendor)}/`);
