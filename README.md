# Aryan's notebook — drop-in blog update

This keeps your portfolio as a static GitHub Pages site. Daily notes, longer articles,
and course lessons all live as Markdown files. A small Node script reads their metadata
and generates the listing that `blog/index.html` displays. The browser loads a full
Markdown file only after someone opens that post.

## Add this to your existing repository

Copy the contents of this package into the **root of your portfolio repository**,
keeping the folder names. Replace these four existing files:

- `blog/index.html`
- `blog/post.html`
- `posts/posts.json`
- `posts/post_format.json`

Add `posts/POST_TEMPLATE.md`, `scripts/build-posts.mjs`, and
`.github/workflows/pages.yml`. Keep your existing root `index.html`, CSS, JS,
`theme.js`, assets, resume, and **all existing Markdown files in `posts/`**.
In particular, the starter catalog points to
`posts/demystifying-linear-regression.md` and
`posts/testing-equations-and-autonomy.md`; those files must already be in your
repository. Their writing is not in this package. If their actual names differ,
correct the `file` paths in `posts/posts.json` before the first build.

The existing linear regression article is provisionally **lesson 1 of Intro to
Machine Learning**. The autonomy article is provisionally a **daily note**.
You can reclassify either by changing that entry in `posts/posts.json` once, or by
adding the metadata comment described below to the Markdown file.

## One-time publishing setup

1. If your default branch is not `main`, edit the `branches: [main]` line in
   `.github/workflows/pages.yml` to match it.
2. In your GitHub repository, open **Settings → Pages → Build and deployment →
   Source**, then choose **GitHub Actions**.
3. Commit and push these files. Check the **Actions** tab for the `Publish
   portfolio and notebook` run.

The workflow builds the catalog in its deploy artifact; it does not commit a
generated file back to your branch. It also deploys your unchanged portfolio files.
You do not need a database, npm installation, or a blog API.

## Publish one daily note

Copy `posts/POST_TEMPLATE.md` to a descriptive lowercase filename, for example
`posts/2026-10-09-rover-tests.md`. Edit the JSON comment at the top and write
below it. Then commit and push **that Markdown file**. Date is `YYYY-MM-DD`.

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
lessons. The course appears as a series on the main page; its lessons also appear
in **Everything** and **Courses**. Each lesson links to its series and its
previous/next lesson automatically.

For your **existing Intro to Machine Learning** series, the linear regression
article is already lesson 1. To add its next post, set
`"course": "intro-to-machine-learning"` and `"lesson": 2` in the new
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
is sufficient; the workflow uses Node 22. A local build updates `posts/posts.json`
in your working tree. You may leave that generated diff uncommitted; the GitHub
Actions build generates it again for the published site.

If you choose to keep **Deploy from a branch** instead of switching to Actions,
run the build locally and commit the updated `posts/posts.json` together with
each Markdown post. That is the manual fallback, not the one-file workflow above.

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
- For an error during publishing, read the **Generate notebook catalog** step
  in the Actions run. It reports the filename and a specific metadata issue.
