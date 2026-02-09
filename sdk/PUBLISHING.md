# Publishing the SDK to npm

This guide is for the package maintainer only. npm publishing requires being logged in as the package owner.

## First-Time Setup

### 1. Create npm account

Go to [npmjs.com](https://www.npmjs.com) and create an account.

### 2. Login from terminal

```bash
npm login
```

Enter your username, password, and email. This stores credentials locally.

### 3. Update package.json

Before first publish, update these fields in `sdk/package.json`:

```json
{
  "author": "Your Name <your@email.com>",
  "repository": {
    "url": "git+https://github.com/YOUR_USERNAME/keeperboard.git"
  },
  "homepage": "https://github.com/YOUR_USERNAME/keeperboard#readme"
}
```

## Publishing a New Version

### 1. Update version number

```bash
cd sdk

# Patch release (1.0.0 -> 1.0.1) - bug fixes
npm version patch

# Minor release (1.0.0 -> 1.1.0) - new features, backward compatible
npm version minor

# Major release (1.0.0 -> 2.0.0) - breaking changes
npm version major
```

This updates `package.json` version and creates a git commit.

> **Note:** `npm version` does NOT create git tags when the package is in a subdirectory of the repo (known npm behavior). You must create the tag manually in step 2.

### 2. Create git tag

```bash
# From repo root — use the version from sdk/package.json
git tag v<VERSION>
# e.g. git tag v1.0.3
```

### 3. Publish to npm

```bash
cd sdk
npm publish
```

The `prepublishOnly` script will automatically build before publishing.

### 4. Push commit and tag

```bash
git push && git push --tags
```

> Publish to npm **before** pushing tags. If publish fails, you can delete the local tag and fix the issue without a stale tag on the remote.

## Verifying Publication

After publishing, verify at:

- https://www.npmjs.com/package/keeperboard

Test installation:

```bash
npm install keeperboard
```

## Version Guidelines

| Change Type                       | Version Bump | Example       |
| --------------------------------- | ------------ | ------------- |
| Bug fix                           | `patch`      | 1.0.0 → 1.0.1 |
| New feature (backward compatible) | `minor`      | 1.0.0 → 1.1.0 |
| Breaking API change               | `major`      | 1.0.0 → 2.0.0 |

## Security Notes

- **Never share your npm credentials**
- **npm login stores a token in `~/.npmrc`** - don't commit this file
- Only you (the npm account owner) can publish
- GitHub repo access does NOT grant npm publish access

## Unpublishing

If you publish by mistake:

```bash
# Within 72 hours of publish
npm unpublish keeperboard@1.0.1
```

After 72 hours, you cannot unpublish. You can only deprecate:

```bash
npm deprecate keeperboard@1.0.1 "This version has a bug, use 1.0.2"
```
