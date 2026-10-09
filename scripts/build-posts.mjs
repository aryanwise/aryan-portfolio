// Build the small, static catalog used by the notebook. Node 20+, no packages.
// Run from any directory: node scripts/build-posts.mjs
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsRoot = path.join(siteRoot, "posts");
const manifestFile = path.join(postsRoot, "posts.json");
const metadataPattern = /^\uFEFF?<!--\s*portfolio-post\s*\r?\n([\s\S]*?)\r?\n-->/;

function fail(file, message) {
  throw new Error(file + ": " + message);
}

function requiredString(value, field, file) {
  if (typeof value !== "string" || !value.trim()) fail(file, field + " is required");
  return value.trim();
}

function isoDate(value, file) {
  if (typeof value !== "string") fail(file, "date must be a string");
  const source = value.trim();
  let date = source;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source)) {
    // Older manifests used dates such as "Sep 30, 2026".
    const parsedLegacy = new Date(source);
    if (Number.isNaN(parsedLegacy.getTime())) fail(file, "date must be a real YYYY-MM-DD date");
    date = parsedLegacy.toISOString().slice(0, 10);
  }
  const parsed = new Date(date + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    fail(file, "date must be a real YYYY-MM-DD date");
  }
  return date;
}

function tagsFrom(value, legacyTag, file) {
  const values = value ?? (legacyTag ? legacyTag.split(/\s*\/\s*/) : []);
  if (!Array.isArray(values) || values.some((tag) => typeof tag !== "string")) {
    fail(file, "tags must be an array of strings");
  }
  return [...new Set(values.map((tag) => tag.trim()).filter(Boolean))];
}

async function markdownFiles(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.name.startsWith(".") || item.name.startsWith("_")) continue;
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await markdownFiles(absolute));
    else if (item.isFile() && item.name.endsWith(".md") && item.name !== "POST_TEMPLATE.md") {
      files.push(absolute);
    }
  }
  return files.sort();
}

async function previousCatalog() {
  try {
    const parsed = JSON.parse(await readFile(manifestFile, "utf8"));
    const posts = Array.isArray(parsed) ? parsed : parsed.posts;
    if (!Array.isArray(posts)) throw new Error("posts.json must contain a posts array");
    return {
      posts: new Map(posts.map((post) => [post.file, post])),
      courses: new Map((Array.isArray(parsed.courses) ? parsed.courses : [])
        .map((course) => [course.id, course])),
    };
  } catch (error) {
    if (error.code === "ENOENT") return { posts: new Map(), courses: new Map() };
    throw error;
  }
}

function metadataFrom(markdown, file, oldPost) {
  const block = markdown.match(metadataPattern);
  if (!block) {
    if (oldPost) return oldPost; // preserve existing posts during migration
    fail(file, "add a portfolio-post metadata comment at the top (see POST_TEMPLATE.md)");
  }
  try {
    const metadata = JSON.parse(block[1]);
    if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
      fail(file, "metadata must be a JSON object");
    }
    return metadata;
  } catch (error) {
    fail(file, "invalid JSON in portfolio-post metadata: " + error.message);
  }
}

function courseId(value, file) {
  const id = requiredString(value, "course.id", file);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail(file, "course.id must be lowercase words joined by hyphens");
  }
  return id;
}

function registerCourse(value, courses, declaredCourses, file) {
  if (typeof value === "string") return courseId(value, file);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(file, "course must be an id or an object with id, title and description");
  }
  const id = courseId(value.id, file);
  const title = requiredString(value.title, "course.title", file);
  const description = requiredString(value.description, "course.description", file);
  const existing = courses.get(id);
  // The Markdown declaration can update details from an older generated catalog.
  // Conflicting declarations within this build are still an error.
  if (declaredCourses.has(id) && existing && (existing.title !== title || existing.description !== description)) {
    fail(file, "course details differ from another lesson in " + id);
  }
  courses.set(id, { id, title, description });
  declaredCourses.add(id);
  return id;
}

const previous = await previousCatalog();
const courses = new Map(previous.courses);
const declaredCourses = new Set();
const posts = [];
const foundFiles = new Set();

for (const absolute of await markdownFiles(postsRoot)) {
  const file = path.relative(postsRoot, absolute).split(path.sep).join("/");
  if (!/^[a-z0-9/_-]+\.md$/.test(file)) {
    fail(file, "use lowercase file names with letters, digits, hyphens or underscores");
  }
  const markdown = await readFile(absolute, "utf8");
  const oldPost = previous.posts.get(file);
  const hasMetadata = metadataPattern.test(markdown);
  const metadata = metadataFrom(markdown, file, oldPost);
  foundFiles.add(file);
  if (metadata.draft === true) continue;

  const kind = metadata.kind ?? metadata.type ?? "daily";
  if (!["daily", "course", "essay", "project-log"].includes(kind)) {
    fail(file, "kind must be daily, course, essay or project-log");
  }
  let course = null;
  let lesson = null;
  if (kind === "course") {
    course = registerCourse(metadata.course, courses, declaredCourses, file);
    lesson = metadata.lesson;
    if (!Number.isInteger(lesson) || lesson < 1) fail(file, "lesson must be a positive integer");
  }

  const oldMinutes = parseInt(String(oldPost?.readTime ?? ""), 10);
  const words = markdown.replace(metadataPattern, "").trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Number.isInteger(metadata.readMinutes) && metadata.readMinutes > 0
    ? metadata.readMinutes
    : hasMetadata
      ? Math.max(1, Math.ceil(words / 220))
      : Number.isInteger(oldPost?.readMinutes) && oldPost.readMinutes > 0
        ? oldPost.readMinutes
        : Number.isInteger(oldMinutes) && oldMinutes > 0
          ? oldMinutes
          : Math.max(1, Math.ceil(words / 220));

  posts.push({
    file,
    title: requiredString(metadata.title, "title", file),
    kind,
    course,
    lesson,
    date: isoDate(metadata.date, file),
    summary: requiredString(metadata.summary, "summary", file),
    tags: tagsFrom(metadata.tags, metadata.tag, file),
    readMinutes,
  });
}

const missing = [...previous.posts.keys()].filter((file) => !foundFiles.has(file));
if (missing.length) {
  throw new Error("Markdown file(s) listed in posts.json are missing: " + missing.join(", "));
}

const seenLessons = new Set();
for (const post of posts) {
  if (post.kind !== "course") continue;
  if (!courses.has(post.course)) fail(post.file, "unknown course " + post.course);
  const key = post.course + "/" + post.lesson;
  if (seenLessons.has(key)) fail(post.file, "duplicate lesson number in " + post.course);
  seenLessons.add(key);
}

posts.sort((a, b) => b.date.localeCompare(a.date) || a.file.localeCompare(b.file));
const publishedCourses = [...courses.values()]
  .filter((course) => posts.some((post) => post.course === course.id))
  .map((course) => ({
    id: course.id,
    title: course.title,
    description: course.description,
    lessonCount: posts.filter((post) => post.course === course.id).length,
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

const output = JSON.stringify({ version: 1, courses: publishedCourses, posts }, null, 2) + "\n";
const temporary = manifestFile + ".tmp";
await writeFile(temporary, output);
await rename(temporary, manifestFile);
console.log("Built posts/posts.json: " + posts.length + " posts, " + publishedCourses.length + " courses");
