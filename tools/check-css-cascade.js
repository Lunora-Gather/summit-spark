#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "public", "summit-spark.css");
const write = process.argv.includes("--write");
const source = fs.readFileSync(cssPath, "utf8");

function withoutComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalizedSelector(value) {
  return withoutComments(value).trim().replace(/\s+/g, " ");
}

function topLevelRules(css) {
  const rules = [];
  let cursor = 0;
  let depth = 0;
  let active = null;
  let comment = false;
  let quote = "";

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    const next = css[index + 1];

    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && character === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") {
      if (depth === 0) {
        const prefix = css.slice(cursor, index);
        const selector = normalizedSelector(prefix);
        const lastCommentEnd = prefix.lastIndexOf("*/");
        active = {
          selector,
          start: cursor + (lastCommentEnd >= 0 ? lastCommentEnd + 2 : 0),
          open: index
        };
      }
      depth += 1;
      continue;
    }
    if (character !== "}") continue;
    depth -= 1;
    if (depth !== 0 || !active) continue;
    active.end = index + 1;
    active.body = css.slice(active.open + 1, index);
    if (active.selector && !active.selector.startsWith("@")) rules.push(active);
    active = null;
    cursor = index + 1;
  }

  if (depth !== 0 || comment || quote) {
    throw new Error("summit-spark.css has an unclosed block, comment, or string");
  }
  return rules;
}

function declarations(body) {
  const clean = withoutComments(body);
  const entries = [];
  let start = 0;
  let parentheses = 0;
  let quote = "";

  function consume(end) {
    const declaration = clean.slice(start, end).trim();
    start = end + 1;
    if (!declaration) return;
    const colon = declaration.indexOf(":");
    if (colon <= 0) return;
    const property = declaration.slice(0, colon).trim();
    const value = declaration.slice(colon + 1).trim();
    if (!/^--[\w-]+$|^[A-Za-z][\w-]*$/.test(property) || !value) return;
    entries.push({
      property,
      important: /!important\s*$/i.test(value)
    });
  }

  for (let index = 0; index < clean.length; index += 1) {
    const character = clean[index];
    if (quote) {
      if (character === "\\") {
        index += 1;
      } else if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === "(") {
      parentheses += 1;
    } else if (character === ")") {
      parentheses = Math.max(0, parentheses - 1);
    } else if (character === ";" && parentheses === 0) {
      consume(index);
    }
  }
  consume(clean.length);
  return entries;
}

function fullyShadowedRules(css) {
  const rules = topLevelRules(css);
  const bySelector = new Map();
  for (const rule of rules) {
    if (!bySelector.has(rule.selector)) bySelector.set(rule.selector, []);
    bySelector.get(rule.selector).push(rule);
  }

  const shadowed = [];
  for (const matchingRules of bySelector.values()) {
    if (matchingRules.length < 2) continue;
    for (let index = 0; index < matchingRules.length - 1; index += 1) {
      const rule = matchingRules[index];
      const current = declarations(rule.body);
      if (current.length === 0) continue;
      const later = matchingRules.slice(index + 1).flatMap((entry) => declarations(entry.body));
      const covered = current.every((entry) => later.some((candidate) => (
        candidate.property === entry.property
          && (!entry.important || candidate.important)
      )));
      if (covered) shadowed.push(rule);
    }
  }
  return shadowed;
}

const shadowed = fullyShadowedRules(source);
if (shadowed.length === 0) {
  console.log("CSS cascade check passed: no fully shadowed top-level rule blocks.");
  process.exit(0);
}

if (!write) {
  console.error(`CSS cascade check failed: ${shadowed.length} fully shadowed top-level rule blocks.`);
  for (const rule of shadowed.slice(0, 12)) {
    const line = source.slice(0, rule.open).split("\n").length;
    console.error(`- line ${line}: ${rule.selector}`);
  }
  console.error("Run node tools/check-css-cascade.js --write to remove only these exact-selector blocks.");
  process.exit(1);
}

let cleaned = source;
for (const rule of [...shadowed].sort((left, right) => right.start - left.start)) {
  cleaned = cleaned.slice(0, rule.start) + cleaned.slice(rule.end);
}
fs.writeFileSync(cssPath, cleaned, "utf8");

const remaining = fullyShadowedRules(cleaned);
if (remaining.length > 0) {
  console.error(`CSS cascade cleanup incomplete: ${remaining.length} shadowed blocks remain.`);
  process.exit(1);
}
console.log(`CSS cascade cleanup removed ${shadowed.length} fully shadowed top-level rule blocks.`);
