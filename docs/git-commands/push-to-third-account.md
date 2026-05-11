# Push to GitHub (third account)

## SSH config (`~/.ssh/config`)

```
Host github-third
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_third
```

## Commands

```bash
# 1. Rename branch to main (if still on master)
git branch -M main

# 2. Add remote using the custom SSH host
git remote add origin git@github-third:Jhoshoa/inventory-app.git

# 3. Push
git push -u origin main
```

## If the remote already exists with wrong URL

```bash
git remote set-url origin git@github-third:Jhoshoa/inventory-app.git
git push -u origin main
```

## Verify the remote

```bash
git remote -v
# Should show:
# origin  git@github-third:Jhoshoa/inventory-app.git (fetch)
# origin  git@github-third:Jhoshoa/inventory-app.git (push)
```

## Test SSH connection

```bash
ssh -T git@github-third
# Should print: Hi Jhoshoa! You've successfully authenticated...
```

## Create a new commit and push

```bash
# 1. Check what changed
git status

# 2. Stage all changes
git add .

# 3. Or stage specific files
git add apps/backend/src/main.py apps/backend/pyproject.toml

# 4. Commit
git commit -m "descripción corta del cambio"

# 5. Push to GitHub
git push
```

## Key difference

| Default | Multiple accounts |
|---|---|
| `git@github.com:user/repo.git` | `git@github-third:user/repo.git` |
| Uses default `~/.ssh/id_ed25519` | Uses `~/.ssh/id_ed25519_third` |
