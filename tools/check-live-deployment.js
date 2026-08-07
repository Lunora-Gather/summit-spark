#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicRoot = path.join(root, "public");
const defaultBaseUrl = "https://lunora-gather.github.io/summit-spark/";
const requestedBaseUrl = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
const timeoutArgument = process.argv.find((argument) => argument.startsWith("--timeout-ms="));
const timeoutMs = Math.max(1000, Math.min(60000, Number(timeoutArgument?.split("=")[1]) || 15000));
const baseUrl = new URL(requestedBaseUrl || process.env.SUMMIT_SPARK_URL || defaultBaseUrl);

function listFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.posix.join(prefix, entry.name);
      return entry.isDirectory()
        ? listFiles(path.join(directory, entry.name), relativePath)
        : [relativePath];
    })
    .sort();
}

function sha256(buffer) {
  const normalized = Buffer.from(buffer.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function expectedMime(relativePath) {
  if (relativePath.endsWith(".html")) return /^text\/html\b/i;
  if (relativePath.endsWith(".css")) return /^text\/css\b/i;
  if (/\.(?:js|mjs)$/.test(relativePath)) return /^(?:text|application)\/javascript\b/i;
  return /^(?:text\/plain|application\/octet-stream)\b/i;
}

function extractBuild(html) {
  return html.match(/<meta name="build-version" content="([^"]+)">/)?.[1] || "";
}

function fail(message) {
  throw new Error(message);
}

function freshUrl(relativePath) {
  const url = new URL(relativePath, baseUrl);
  url.searchParams.set("deployment-check", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return url.href;
}

async function fetchFile(relativePath) {
  const url = freshUrl(relativePath);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
      redirect: "follow",
      signal: controller.signal
    });
    if (!response.ok) fail(`${relativePath} returned HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!expectedMime(relativePath).test(contentType)) {
      fail(`${relativePath} returned unexpected Content-Type ${contentType || "(missing)"}`);
    }
    return {
      contentType,
      data: Buffer.from(await response.arrayBuffer())
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFiles(files) {
  try {
    return new Map(await Promise.all(files.map(async (relativePath) => [relativePath, await fetchFile(relativePath)])));
  } catch (error) {
    if (process.platform !== "win32") throw error;
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$items = [Console]::In.ReadToEnd() | ConvertFrom-Json",
      "$results = @($items | ForEach-Object {",
      "  $response = Invoke-WebRequest -Uri $_.url -UseBasicParsing -TimeoutSec $_.timeout",
      "  [PSCustomObject]@{ path = $_.path; contentType = [string]$response.Headers['Content-Type']; data = [Convert]::ToBase64String($response.RawContentStream.ToArray()) }",
      "})",
      "$results | ConvertTo-Json -Compress -Depth 3"
    ].join("\n");
    const input = JSON.stringify(files.map((relativePath) => ({
      path: relativePath,
      url: freshUrl(relativePath),
      timeout: Math.ceil(timeoutMs / 1000)
    })));
    const fallback = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      input,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      timeout: Math.min(60000, timeoutMs * 2)
    });
    if (fallback.status !== 0) {
      throw new Error(`native fetch failed (${error?.cause?.code || error?.message || "unknown"}); Windows fallback failed: ${(fallback.stderr || fallback.stdout || "unknown").trim()}`);
    }
    const results = JSON.parse(fallback.stdout || "[]");
    return new Map(results.map((result) => [result.path, {
      contentType: result.contentType,
      data: Buffer.from(result.data, "base64")
    }]));
  }
}

async function main() {
  if (!/^https?:$/.test(baseUrl.protocol)) fail("deployment URL must use http or https");
  if (!baseUrl.pathname.endsWith("/")) baseUrl.pathname += "/";

  const files = listFiles(publicRoot);
  const localIndex = fs.readFileSync(path.join(publicRoot, "index.html"), "utf8");
  const build = extractBuild(localIndex);
  if (!/^\d{8}-p\d+$/.test(build)) fail("local build-version is missing or malformed");
  for (const marker of [
    "default-src 'self'",
    "object-src 'none'",
    "script-src 'self'",
    `summit-spark.css?v=${build}`,
    `summit-spark.js?v=${build}`
  ]) {
    if (!localIndex.includes(marker)) fail(`local index is missing ${marker}`);
  }

  const localRuntime = fs.readFileSync(path.join(publicRoot, "summit-spark.js"), "utf8");
  if (!localRuntime.includes('const hairColor = "#294657"')) fail("fixed #294657 hair invariant is missing");
  if (/hairColor\s*=\s*(?:player\.|recharge|relay|gate|echo|collected|block\.)/.test(localRuntime)) {
    fail("hair color depends on gameplay state");
  }
  if (!files.includes("vendor/appwrite-26.2.0.js")) fail("pinned Appwrite SDK is missing locally");

  const downloads = await fetchFiles(files);
  const results = files.map((relativePath) => {
    const local = fs.readFileSync(path.join(publicRoot, ...relativePath.split("/")));
    const download = downloads.get(relativePath);
    if (!download) fail(`${relativePath} was not returned by the deployment`);
    if (!expectedMime(relativePath).test(download.contentType)) {
      fail(`${relativePath} returned unexpected Content-Type ${download.contentType || "(missing)"}`);
    }
    const remote = download.data;
    const localHash = sha256(local);
    const remoteHash = sha256(remote);
    if (localHash !== remoteHash) {
      fail(`${relativePath} does not match local ${build} (${remoteHash.slice(0, 12)} != ${localHash.slice(0, 12)})`);
    }
    return { relativePath, bytes: remote.length };
  });

  const bytes = results.reduce((sum, result) => sum + result.bytes, 0);
  console.log(`Live deployment passed: ${build}, ${files.length} canonical public files, ${bytes} served bytes at ${baseUrl.href}`);
}

main().catch((error) => {
  const reason = error?.name === "AbortError" ? `request timed out after ${timeoutMs}ms` : error?.message || String(error);
  console.error(`Live deployment check failed: ${reason}`);
  process.exit(1);
});
