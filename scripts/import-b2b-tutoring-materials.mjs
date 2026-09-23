import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Pass the updated B-end tutoring material directory.");

const materials = [
  ["b-yucai-rocket", "小火箭育才班教学服务 .jpg"],
  ["b-kete-moon", "探月科特班教学服务介绍海报 (1).jpg"],
  ["b-kete-python", "python科特班-教学服务介绍海报 (2).jpg"],
  ["b-yingcai-rocket", "小火箭英才班教学服务.jpg"],
  ["b-yingcai-moon", "探月英才班教学服务介绍海报 (3).jpg"],
  ["b-yingcai-python", "python英才班教学服务介绍海报 (3) - 副本.jpg"]
];

for (const [profile, filename] of materials) {
  const output = path.resolve("public/images/course-plan", profile, "tutoring-20260923.webp");
  const result = await sharp(path.join(source, filename))
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(output);
  console.log(`${profile}: ${result.width}x${result.height} (${result.size} bytes)`);
}
