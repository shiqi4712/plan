import assert from "node:assert/strict";

const origin = new URL(process.argv[2] ?? "http://127.0.0.1:3100");
const profiles = ["yucai-rocket", "yucai-preschool", "kete-moon", "kete-python", "yingcai-python"];
const checkedAssets = new Set();
for (const profile of profiles) {
  const response = await fetch(new URL(`/course-plan/${profile}`, origin), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${profile}: HTTP status`);
  const html = await response.text();
  const renderedText = html.replaceAll("<!-- -->", "");
  assert.equal((html.match(/<section\b/g) ?? []).length, 13, `${profile}: expected 13 pages`);
  assert.ok(html.includes("奠定少儿编程领域第一") && html.includes("codemao-authority-partners.webp"), `${profile}: latest closing copy and poster`);
  assert.ok(!html.includes("MONTHS"), `${profile}: Chinese month labels`);
  assert.ok(html.includes(profile.startsWith("yucai") ? 'aria-label="学习目标"' : 'aria-label="赛考目标"'));
  const className = profile === "yucai-rocket" ? "育才班" : profile === "yucai-preschool" || profile === "yingcai-python" ? "英才班" : "科特班";
  const outcomes = ["科技特长生——保送名校", `${className}学生学习成果—科特生`, `${className}学生学习成果—信奥金牌`, `${className}学生学习成果—助力升学`];
  const positions = outcomes.map(label => html.indexOf(`aria-label="${label}"`));
  assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), `${profile}: outcome order and class names`);
  assert.ok(renderedText.includes(`${className}学员成长成果`) && renderedText.includes(`${className}培养的学员`));
  assert.ok(html.includes("outcome-ioi-38-gold-2026.webp") && html.includes("2026 年，编程猫合计斩获 38 枚"));
  assert.ok(!html.includes("重点初中") && html.includes("重点中学"));
  assert.ok(html.includes('aria-label="专业教研"') && html.includes('aria-label="上课老师"'));
  if (profile === "yucai-preschool") assert.ok(html.includes("goals-outcomes.webp"));
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const asset = match[1].replaceAll("&amp;", "&");
    if ((!asset.startsWith("/images/") && !asset.startsWith("/_next/")) || checkedAssets.has(asset)) continue;
    const result = await fetch(new URL(asset, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(result.status, 200, asset);
    assert.ok((await result.arrayBuffer()).byteLength > 0, asset);
    checkedAssets.add(asset);
  }
  console.log(`${profile}: OK`);
}
for (const route of ["/", "/admin", "/teacher", "/result", "/api/query", "/course-plan/demo2", "/course-plan/unknown"]) {
  const response = await fetch(new URL(route, origin), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 404, `Unpublished route ${route}`);
}
console.log(`${profiles.length} public routes and ${checkedAssets.size} assets passed; unpublished routes return 404.`);
