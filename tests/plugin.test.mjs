import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const marketplacePath = resolve(root, '.agents/plugins/marketplace.json');
const marketplace = readJson(marketplacePath);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isAsciiLowercaseLetter(character) {
  return character >= 'a' && character <= 'z';
}

function isAsciiUppercaseLetter(character) {
  return character >= 'A' && character <= 'Z';
}

function isAsciiDigit(character) {
  return character >= '0' && character <= '9';
}

function isIdentifierCharacter(character) {
  return isAsciiLowercaseLetter(character)
    || isAsciiUppercaseLetter(character)
    || isAsciiDigit(character)
    || character === '-'
    || character === '_';
}

function assertIdentifier(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(value.length > 0, `${label} must not be empty`);
  for (const character of value) {
    assert.ok(
      isIdentifierCharacter(character),
      `${label} contains an unsupported character: ${character}`,
    );
  }
}

function assertPluginName(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  const segments = value.split('.');
  assert.ok(segments.length > 0, `${label} must not be empty`);
  for (const segment of segments) {
    assertIdentifier(segment, label);
  }
}

function isReleaseVersion(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  for (const part of parts) {
    if (part.length === 0) return false;
    if (part.length > 1 && part.startsWith('0')) return false;
    for (const character of part) {
      if (!isAsciiDigit(character)) return false;
    }
  }
  return true;
}

function packagePath(base, path) {
  assert.equal(typeof path, 'string', 'Package path must be a string');
  assert.ok(path.startsWith('./'), `Package path must start with ./: ${path}`);

  const realBase = realpathSync(base);
  const target = realpathSync(resolve(base, path));
  const child = relative(realBase, target);
  const escapesBase = child === '..'
    || child.startsWith(`..${sep}`)
    || isAbsolute(child);

  assert.equal(escapesBase, false, `Package path escapes its root: ${path}`);
  return target;
}

function readFrontmatter(source, label) {
  const lines = source.split('\n');
  assert.equal(lines[0], '---', `${label} must start with YAML frontmatter`);

  const end = lines.indexOf('---', 1);
  assert.ok(end > 1, `${label} frontmatter must be closed`);

  const values = new Map();
  for (const line of lines.slice(1, end)) {
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values.set(key, value);
  }
  return values;
}

function referencedSkillNames(source) {
  const names = new Set();
  let position = 0;

  while (position < source.length) {
    const marker = source.indexOf('$', position);
    if (marker < 0) break;

    let cursor = marker + 1;
    if (!isAsciiLowercaseLetter(source[cursor])) {
      position = cursor;
      continue;
    }

    let name = '';
    while (cursor < source.length) {
      const character = source[cursor];
      if (!isAsciiLowercaseLetter(character)
        && !isAsciiDigit(character)
        && character !== '-') {
        break;
      }
      name += character;
      cursor += 1;
    }

    names.add(name);
    position = cursor;
  }

  return names;
}

test('marketplace entries resolve to self-contained plugins', () => {
  assertIdentifier(marketplace.name, 'Marketplace name');
  assert.ok(Array.isArray(marketplace.plugins));
  assert.ok(marketplace.plugins.length > 0, 'Marketplace must contain a plugin');

  const names = new Set();
  for (const entry of marketplace.plugins) {
    assertPluginName(entry.name, 'Plugin name');
    assert.equal(names.has(entry.name), false, `Duplicate plugin: ${entry.name}`);
    names.add(entry.name);

    assert.equal(entry.source.source, 'local');
    assert.ok(entry.category, 'Plugin category is required');
    assert.ok(
      ['AVAILABLE', 'INSTALLED_BY_DEFAULT', 'NOT_AVAILABLE']
        .includes(entry.policy.installation),
      'Unsupported installation policy',
    );
    assert.ok(
      ['ON_INSTALL', 'ON_USE'].includes(entry.policy.authentication),
      'Unsupported authentication policy',
    );

    const pluginRoot = packagePath(root, entry.source.path);
    const manifestPath = resolve(pluginRoot, '.codex-plugin/plugin.json');
    assert.ok(statSync(manifestPath).isFile());
    assert.equal(readJson(manifestPath).name, entry.name);
  }
});

for (const entry of marketplace.plugins) {
  const pluginRoot = packagePath(root, entry.source.path);
  const manifest = readJson(resolve(pluginRoot, '.codex-plugin/plugin.json'));

  test(`${entry.name}: manifest contains release metadata`, () => {
    assert.equal(isReleaseVersion(manifest.version), true);
    assert.equal(typeof manifest.description, 'string');
    assert.ok(manifest.description.trim());
    assert.equal(typeof manifest.author?.name, 'string');
    assert.ok(manifest.author.name.trim());
    assert.equal(manifest.license, 'Apache-2.0');

    const license = readFileSync(resolve(root, 'LICENSE'), 'utf8');
    assert.ok(license.includes('Apache License'));
    assert.ok(license.includes('Version 2.0, January 2004'));

    const prompts = manifest.interface?.defaultPrompt;
    assert.ok(Array.isArray(prompts));
    assert.ok(prompts.length > 0 && prompts.length <= 3);
    for (const prompt of prompts) {
      assert.equal(typeof prompt, 'string');
      assert.ok(prompt.trim());
      assert.ok(Array.from(prompt).length <= 128);
    }
  });

  test(`${entry.name}: MCP configuration contains no bundled credentials`, () => {
    assert.equal(manifest.apps, undefined);
    assert.equal(existsSync(resolve(pluginRoot, '.app.json')), false);

    const mcpPath = packagePath(pluginRoot, manifest.mcpServers);
    assert.ok(statSync(mcpPath).isFile());
    const mcp = readJson(mcpPath);
    assert.ok(mcp.mcpServers && typeof mcp.mcpServers === 'object');
    assert.ok(Object.keys(mcp.mcpServers).length > 0);

    for (const server of Object.values(mcp.mcpServers)) {
      assert.deepEqual(Object.keys(server).sort(), ['type', 'url']);
      assert.equal(server.type, 'http');

      const url = new URL(server.url);
      assert.equal(url.protocol, 'https:');
      assert.equal(url.username, '');
      assert.equal(url.password, '');
      assert.equal(url.search, '');
      assert.equal(url.hash, '');
    }
  });

  test(`${entry.name}: bundled skills and references are complete`, () => {
    const skillsRoot = packagePath(pluginRoot, manifest.skills);
    assert.ok(statSync(skillsRoot).isDirectory());

    const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true })
      .filter(directory => directory.isDirectory());
    assert.ok(skillDirectories.length > 0, 'Plugin must contain at least one skill');

    for (const directory of skillDirectories) {
      assertIdentifier(directory.name, 'Skill directory name');
      const skillPath = packagePath(skillsRoot, `./${directory.name}/SKILL.md`);
      const source = readFileSync(skillPath, 'utf8');
      const frontmatter = readFrontmatter(source, directory.name);

      assert.equal(frontmatter.get('name'), directory.name);
      assert.ok(frontmatter.get('description'));

      for (const referencedName of referencedSkillNames(source)) {
        packagePath(skillsRoot, `./${referencedName}/SKILL.md`);
      }
    }
  });
}
