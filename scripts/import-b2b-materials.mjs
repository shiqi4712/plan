import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Pass the B-end material directory as the first argument.");

const files = [
  ["b-yucai-rocket", "育才班", "ScreenShot_2026-09-22_181345_087.png", "intro"],
  ["b-kete-moon", "探月python科特班", "ScreenShot_2026-09-22_181513_862.png", "intro"],
  ["b-kete-python", "探月python科特班", "ScreenShot_2026-09-22_181513_862.png", "intro"],
  ["b-yingcai-rocket", "小火箭英才班", "班级介绍.png", "intro"],
  ["b-yingcai-rocket", "小火箭英才班", "教学服务.png", "tutoring"],
  ["b-yingcai-rocket", "小火箭英才班", "课程大纲.jpg", "syllabus"],
  ["b-yingcai-rocket", "小火箭英才班", "课程规划.png", "goals"],
  ["b-yingcai-rocket", "小火箭英才班", "学习时间表.png", "schedule"],
  ["b-yingcai-moon", "探月英才班", "班型介绍.png", "intro"],
  ["b-yingcai-moon", "探月英才班", "教学服务.png", "tutoring"],
  ["b-yingcai-moon", "探月英才班", "英才班探月学习规划.jpg", "goals"],
  ["b-yingcai-moon", "探月英才班", "赛考规划.jpg", "goals-exam"],
  ["b-yingcai-moon", "探月英才班", "学习时间安排表.jpg", "schedule"],
  ["b-yingcai-python", "python英才班", "班级介绍.png", "intro"],
  ["b-yingcai-python", "python英才班", "教学服务.png", "tutoring"],
  ["b-yingcai-python", "python英才班", "学习规划.jpg", "goals"],
  ["b-yingcai-python", "python英才班", "赛考规划.jpg", "goals-exam"],
  ["b-yingcai-python", "python英才班", "时间安排表.jpg", "schedule"]
];

for (const [profile, folder, filename, asset] of files) {
  const output = path.resolve("public/images/course-plan", profile);
  await fs.mkdir(output, { recursive: true });
  const info = await sharp(path.join(source, folder, filename))
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(path.join(output, `${asset}.webp`));
  console.log(`${profile}/${asset}.webp ${info.width}x${info.height} ${info.size} bytes`);
}
