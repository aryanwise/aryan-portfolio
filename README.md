# Aryan's Logs

This keeps your portfolio as a static GitHub Pages site. Daily notes, longer articles,
and course lessons all live as Markdown files. A small Node script reads their metadata
and generates the listing that `blog/index.html` displays. The browser loads a full
Markdown file only after someone opens that post.

## Add or update writing

1. Save your Markdown file inside `posts/` with the metadata comment shown below.
2. From the repository root, run:

   ```sh
   node scripts/build-posts.mjs
   ```

3. Preview the page, then commit or upload both the Markdown file and the
   regenerated `posts/posts.json` with your normal site updates.

The catalog build discovers new notes, courses, and lessons automatically. This
checkout does not include a publishing workflow, so run the command after changing
your writing. You do not need a database, npm installation, or a blog API.

## Publish one daily note

Copy `posts/POST_TEMPLATE.md` to a descriptive lowercase filename, for example
`posts/2026-10-09-rover-tests.md`. Edit the JSON comment at the top and write
below it. Then run the catalog command above. Date is `YYYY-MM-DD`.

```md
<!-- portfolio-post
{
  "title": "What I learned from rover tests",
  "date": "2026-10-09",
  "kind": "daily",
  "summary": "A short, useful description for the blog listing.",
  "tags": ["Robotics", "Learning"]
}
-->

# What I learned from rover tests

Your writing goes here.
```

The note appears in **Everything** and **Daily notes**. Daily notes are grouped
by month in the daily view.

## Start a course

The first lesson declares the course title and description in its Markdown
metadata. For a **new** course, save a file such as `posts/robotics-01.md`:

```md
<!-- portfolio-post
{
  "title": "Sensors and state",
  "date": "2026-10-09",
  "kind": "course",
  "course": {
    "id": "robotics-from-scratch",
    "title": "Robotics from Scratch",
    "description": "Practical lessons on how a robot senses, decides, and acts."
  },
  "lesson": 1,
  "summary": "The question this lesson answers, in one sentence.",
  "tags": ["Robotics"]
}
-->

# Sensors and state

Your lesson goes here.
```

For lesson 2 and later, use the **same course ID as a string**:

```json
{
  "title": "Turning sensor readings into motion",
  "date": "2026-10-10",
  "kind": "course",
  "course": "robotics-from-scratch",
  "lesson": 2,
  "summary": "A small example of a robot acting on sensor data.",
  "tags": ["Robotics"]
}
```

Put that JSON inside the same `<!-- portfolio-post` / `-->` wrapper and add
your Markdown beneath it. For a different course, choose a new lowercase ID,
declare its title and description in its first lesson, and use that ID in later
lessons. The course appears in **Everything** and **Courses**. Its overview lists
lessons in reading order. Each lesson links to its course and its previous/next
lesson automatically.

Your **existing Intro to Machine Learning** series has four lessons. To add its
next lesson, set
`"course": "intro-to-machine-learning"` and `"lesson": 5` in the new
Markdown file. You do not need to repeat the title or description.

You can use `"kind": "essay"` or `"kind": "project-log"` for other writing.
These show in **Everything**. Add `"draft": true` to the metadata comment to
hide a new post without deleting it. `readMinutes` is optional; the build computes
it from the Markdown when omitted. Keep the course's `id` stable after publishing
because course URLs use it.

`posts/post_format.json` is a reference with metadata examples; you do **not**
edit it for each post. `posts/posts.json` is the generated catalog; you do **not**
edit it for each post either.

## Preview locally

From the repository root:

```sh
node scripts/build-posts.mjs
python3 -m http.server 8000
```

Open `http://localhost:8000/blog/`. Your VS Code Live Server also works after
running the build command. Do not open `blog/index.html` directly as a `file:`
URL; the browser needs HTTP to fetch the JSON and Markdown. Node 20 or newer
is sufficient. A local build updates `posts/posts.json` in your working tree;
include that generated file with your Markdown changes when publishing.

## A couple of practical details

- Filenames should be lowercase with letters, numbers, hyphens, or underscores.
  Subfolders inside `posts/` are fine. Each course lesson needs a unique positive
  lesson number within that course.
- For images in a post, use a URL that is relative to `blog/post.html`, such as
  `![Rover](../posts/media/rover.webp)`. Keep images compressed; large images,
  not the JSON catalog, are the main size concern on a static site.
- When converting one of the two original posts to front matter, put the
  `portfolio-post` comment at the very top. The site strips it from the article
  view. Until then, those two entries keep their migrated metadata from the
  starter catalog.
- README documentation and `POST_TEMPLATE.md` are excluded from the catalog.
- If the catalog build fails, read its terminal output. It reports the filename
  and a specific metadata issue; the last valid catalog stays intact.
