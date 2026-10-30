# One-click installers

Each installer installs only what is missing, using the latest release for your system:
Git, Node.js, Python 3 (+ python-pptx, pymupdf), LibreOffice, **OpenCode Desktop**, the **OpenCode CLI**, and the
Slides plugin (cloned into `~/.config/opencode/plugins/opencode-slides`, or updated with `git pull`). It finishes by
running the plugin's self-test and lists anything that failed.

| Platform | File | Notes |
|---|---|---|
| Windows | `OpenCode-Slides-Setup.exe` | Double-click. Picks the x64 / ARM64 build (baseline CLI on CPUs without AVX2). Dependencies via winget; OpenCode from GitHub releases, winget as fallback. CLI goes to `%USERPROFILE%\.opencode\bin` (added to your PATH). |
| macOS | `install-mac.command` | Double-click (first time: right-click > Open). Picks the Apple Silicon / Intel build. Dependencies via Homebrew (installed if missing); OpenCode Desktop to `/Applications`, CLI to `~/.opencode/bin` (added to PATH in `~/.zprofile`). |

Existing installs are left as they are; to update OpenCode itself, use its built-in updater.

The `.exe` is unsigned, so Windows SmartScreen may ask you to confirm (More info > Run anyway).

Rebuild the Windows exe after editing the scripts (uses the IExpress tool built into Windows), from this folder:

```
iexpress /N /Q build-windows-exe.sed
```
