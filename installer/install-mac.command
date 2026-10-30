#!/bin/bash
# OpenCode + Slides plugin one-click installer (macOS). Double-click to run.
# Installs whatever is missing: Homebrew, git, node, python (+ python-pptx, pymupdf), LibreOffice,
# OpenCode Desktop and the OpenCode CLI (latest release, matching this Mac), then the Slides plugin.
PLUGIN_REPO="https://github.com/aswanthwuhan/opencode-slides-plugin"
PLUGIN_DIR="$HOME/.config/opencode/plugins/opencode-slides"
RELEASE_API="https://api.github.com/repos/anomalyco/opencode/releases/latest"
CLI_DIR="$HOME/.opencode/bin"
failed=()
step(){ printf "\n\033[36m==> %s\033[0m\n" "$1"; }
ok(){ printf "    \033[32m[ok]\033[0m %s\n" "$1"; }
warn(){ printf "    \033[33m[!]\033[0m  %s\n" "$1"; }

# Pick the build matching this Mac, even if the shell runs under Rosetta.
arch="x64"
if [ "$(uname -m)" = "arm64" ] || [ "$(sysctl -in hw.optional.arm64 2>/dev/null)" = "1" ]; then arch="arm64"; fi
# Intel Macs without AVX2 need the "baseline" CLI build.
cli_variant="$arch"
if [ "$arch" = "x64" ] && ! sysctl -n machdep.cpu.leaf7_features 2>/dev/null | grep -q AVX2; then cli_variant="x64-baseline"; fi
echo "OpenCode + Slides plugin installer (macOS $(sw_vers -productVersion), $arch)"

load_brew(){ for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do if [ -x "$b" ]; then eval "$("$b" shellenv)"; return; fi; done; }
load_brew

step "Homebrew"
if command -v brew >/dev/null; then ok "$(brew --version | head -1)"; else
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_brew
  if command -v brew >/dev/null; then ok "Homebrew installed"; else warn "Homebrew failed"; failed+=("Homebrew"); fi
fi

step "git, node, python"
for pair in git:git node:node python3:python; do
  cmd="${pair%%:*}"; formula="${pair##*:}"
  # /usr/bin/git and /usr/bin/python3 are only stubs until the Command Line Tools are installed.
  if command -v "$cmd" >/dev/null && "$cmd" --version >/dev/null 2>&1; then ok "$cmd: $("$cmd" --version 2>&1 | head -1)"
  elif command -v brew >/dev/null && brew install "$formula"; then ok "$formula installed"
  else warn "$cmd missing"; failed+=("$cmd"); fi
done

step "LibreOffice"
if [ -d /Applications/LibreOffice.app ]; then ok "already installed"
elif command -v brew >/dev/null && brew install --cask libreoffice; then ok "LibreOffice installed"
else warn "LibreOffice missing (only needed for screenshots when the panel is closed)"; failed+=("LibreOffice"); fi

step "Python packages"
PY="$(command -v python3)"
if [ -n "$PY" ]; then
  if "$PY" -m pip install --upgrade --quiet python-pptx pymupdf 2>/dev/null \
     || "$PY" -m pip install --upgrade --quiet --user python-pptx pymupdf 2>/dev/null \
     || "$PY" -m pip install --upgrade --quiet --user --break-system-packages python-pptx pymupdf; then
    ok "python-pptx, pymupdf installed"
  else warn "pip failed"; failed+=("pip packages"); fi
else failed+=("pip packages"); fi

json="$(curl -fsSL -H 'User-Agent: opencode-installer' "$RELEASE_API")" || warn "could not query the latest OpenCode release"
tag="$(printf '%s' "$json" | grep -o '"tag_name": *"[^"]*"' | head -1 | cut -d'"' -f4)"
asset_url(){ printf '%s' "$json" | grep -o "https://[^\"]*/$1\"" | head -1 | tr -d '"'; }

step "OpenCode Desktop"
if [ -d /Applications/OpenCode.app ]; then ok "already installed (/Applications/OpenCode.app)"
else
  url="$(asset_url "opencode-desktop-mac-$arch.dmg")"
  if [ -n "$url" ]; then
    tmp="$(mktemp -d)"
    echo "    downloading $tag ($arch)..."
    if curl -fL --progress-bar "$url" -o "$tmp/oc.dmg" \
       && mnt="$(hdiutil attach "$tmp/oc.dmg" -nobrowse -noautoopen | grep -o '/Volumes/.*' | tail -1)" && [ -d "$mnt" ]; then
      app="$(ls -d "$mnt"/*.app 2>/dev/null | head -1)"
      if [ -n "$app" ]; then
        name="$(basename "$app")"
        cp -R "$app" /Applications/ 2>/dev/null || sudo cp -R "$app" /Applications/
        xattr -dr com.apple.quarantine "/Applications/$name" 2>/dev/null
        ok "OpenCode Desktop $tag installed to /Applications/$name"
      else warn "no app found in the disk image"; failed+=("OpenCode Desktop"); fi
      hdiutil detach "$mnt" -quiet
    else warn "download/mount failed"; failed+=("OpenCode Desktop"); fi
    rm -rf "$tmp"
  else warn "could not find the release asset for $arch - get it from https://opencode.ai"; failed+=("OpenCode Desktop"); fi
fi

step "OpenCode CLI"
if command -v opencode >/dev/null; then ok "already installed ($(command -v opencode))"
elif [ -x "$CLI_DIR/opencode" ]; then ok "already installed ($CLI_DIR/opencode)"
else
  zurl="$(asset_url "opencode-darwin-$cli_variant.zip")"
  if [ -n "$zurl" ]; then
    tmp="$(mktemp -d)"; mkdir -p "$CLI_DIR"
    if curl -fsSL "$zurl" -o "$tmp/cli.zip" && unzip -oq "$tmp/cli.zip" -d "$CLI_DIR" && chmod +x "$CLI_DIR/opencode"; then
      xattr -d com.apple.quarantine "$CLI_DIR/opencode" 2>/dev/null
      for rc in "$HOME/.zprofile" "$HOME/.bash_profile"; do
        grep -qs '.opencode/bin' "$rc" || echo 'export PATH="$HOME/.opencode/bin:$PATH"' >> "$rc"
      done
      ok "opencode CLI $tag ($cli_variant) installed to $CLI_DIR"
    else warn "CLI install failed"; failed+=("OpenCode CLI"); fi
    rm -rf "$tmp"
  else warn "no CLI asset for $cli_variant"; failed+=("OpenCode CLI"); fi
fi

step "Slides plugin"
if command -v git >/dev/null && git --version >/dev/null 2>&1; then
  if [ -d "$PLUGIN_DIR/.git" ]; then
    if git -C "$PLUGIN_DIR" pull --ff-only; then ok "plugin updated"; else warn "git pull failed (local changes?) - keeping the current copy"; fi
  elif [ -d "$PLUGIN_DIR" ] && [ -n "$(ls -A "$PLUGIN_DIR")" ]; then
    warn "$PLUGIN_DIR exists but is not a git clone - leaving it alone"
  else
    mkdir -p "$(dirname "$PLUGIN_DIR")"
    if git clone "$PLUGIN_REPO" "$PLUGIN_DIR"; then ok "cloned to $PLUGIN_DIR"; else failed+=("plugin clone"); fi
  fi
  if [ -f "$PLUGIN_DIR/index.js" ] && [ -f "$PLUGIN_DIR/gui-experimental.cjs" ] && [ -f "$PLUGIN_DIR/dist/viewer.js" ]; then
    ok "plugin files verified"
    if command -v node >/dev/null; then
      last="$(cd "$PLUGIN_DIR" && node dev/main.test.mjs 2>&1 | tail -1)"
      if [ "$last" = "ALL OK" ]; then ok "self-test: ALL OK"; else warn "self-test: $last"; failed+=("self-test"); fi
    fi
  else warn "plugin files incomplete"; failed+=("plugin files"); fi
else warn "git unavailable, cannot fetch plugin"; failed+=("plugin"); fi

echo
if [ ${#failed[@]} -gt 0 ]; then printf "\033[33mFinished with issues: %s\033[0m\n" "${failed[*]}"; else printf "\033[32mAll done!\033[0m\n"; fi
echo 'Fully quit and reopen OpenCode Desktop, then: side panel "+" > Slides > Open.'
echo 'Open a new terminal window to use the opencode CLI.'
read -n 1 -s -r -p "Press any key to close"
echo
