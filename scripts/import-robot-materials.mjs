import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Pass the robot material directory.");

const materials = [
  ["课程介绍.png", "b-yingcai-robot/intro.webp"],
  ["课程大纲.png", "b-yingcai-robot/syllabus.webp"],
  ["赛考目标.png", "b-yingcai-robot/goals.webp"],
  ["时间安排.png", "b-yingcai-robot/schedule.webp"],
  ["教学服务.jpg_a96b91e82d1c8e75fa69e8b1aa6db504", "b-yingcai-robot/tutoring.webp"]
];

for (const [filename, relative] of materials) {
  const output = path.resolve("public/images/course-plan", relative);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const result = await sharp(path.join(source, filename))
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(output);
  console.log(`${relative}: ${result.width}x${result.height} (${result.size} bytes)`);
}
