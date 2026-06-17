import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import os from "node:os";

const repoRoot = process.cwd();
const distDir = join(repoRoot, "dist");
const worktreeDir = join(os.tmpdir(), "portfolio-home-gh-pages");

if (!existsSync(distDir)) {
  throw new Error("dist directory not found. Run the build first.");
}

const removeDirectory = (targetPath) => {
  if (existsSync(targetPath)) {
    rmSync(targetPath, { recursive: true, force: true });
  }
};

const copyDirectory = (sourcePath, targetPath) => {
  mkdirSync(targetPath, { recursive: true });

  for (const entry of readdirSync(sourcePath, { withFileTypes: true })) {
    const sourceEntryPath = join(sourcePath, entry.name);
    const targetEntryPath = join(targetPath, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourceEntryPath, targetEntryPath);
      continue;
    }

    if (entry.isFile()) {
      copyFileSync(sourceEntryPath, targetEntryPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      copyFileSync(sourceEntryPath, targetEntryPath);
    }
  }
};

removeDirectory(worktreeDir);

try {
  execFileSync("git", ["worktree", "add", "--force", "-B", "gh-pages", worktreeDir, "HEAD"], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  for (const entry of readdirSync(worktreeDir, { withFileTypes: true })) {
    if (entry.name === ".git") {
      continue;
    }

    removeDirectory(join(worktreeDir, entry.name));
  }

  copyDirectory(distDir, worktreeDir);

  execFileSync("git", ["add", "-A"], { cwd: worktreeDir, stdio: "inherit" });

  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: worktreeDir,
    encoding: "utf8",
  }).trim();

  if (status) {
    execFileSync("git", ["commit", "-m", "Deploy to GitHub Pages"], {
      cwd: worktreeDir,
      stdio: "inherit",
    });
  }

  execFileSync("git", ["push", "origin", "gh-pages", "--force"], {
    cwd: worktreeDir,
    stdio: "inherit",
  });
} finally {
  try {
    execFileSync("git", ["worktree", "remove", "--force", worktreeDir], {
      cwd: repoRoot,
      stdio: "ignore",
    });
  } catch {
    removeDirectory(worktreeDir);
  }
}