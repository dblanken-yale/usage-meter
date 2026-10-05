# usage-meter

A Claude Code mod that keeps your context window, usage limits, and session cost visible in a row above the prompt, so you don't have to open the usage popup to check them.

```
● ctx 42% ▮▮▮▮▯▯▯▯▯▯ 84k/200k   5h 2% ▯▯▯▯▯▯▯▯▯▯ 8:10 PM   7d 10% ▮▯▯▯▯▯▯▯▯▯ Sat 3:00 AM   $1.23
```

## What it shows

| Piece | Means |
| --- | --- |
| `ctx` | How full the context window is, with tokens used out of the window size |
| `5h` | Your 5-hour session limit, and when it resets |
| `7d` | Your weekly limit, and when it resets |
| `$` | What this session has cost so far |

These are the same figures the status line and the usage popup read. A reset within the next 20 hours shows the time only; a later one shows the weekday too.

Each bar fills green, turns yellow at 70%, and red at 90%.

The limit meters only appear on a Claude subscription, after the first reply reports them. Any other limit window Claude Code reports (a gateway spend limit, for example) gets a meter of its own, labeled with its raw name.

## Install

1. Clone the repo into your mods folder:

   ```bash
   git clone git@github.com:dblanken-yale/usage-meter.git ~/.claude/mods/usage-meter
   ```

2. Add the folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`:

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/usage-meter"
     }
   }
   ```

   If the variable already lists other folders, add this one with a `:` between them, for example `"~/.claude/mods/cache-buster:~/.claude/mods/usage-meter"`.

3. Start a new Claude Code session, in the terminal or the desktop app.

To try it in one terminal session without changing settings:

```bash
claude --plugin-dir ~/.claude/mods/usage-meter
```

## Update

```bash
git -C ~/.claude/mods/usage-meter pull
```

Terminal sessions reload the mod when its files change. Desktop app sessions pick it up when you start a new one.

## Notes

- It shares the row above the prompt with other mods. It calls `next(e)` and stacks whatever the mods beneath drew under its own row. A mod above it that returns only its own row hides it; [cache-buster](https://github.com/dblanken-yale/cache-buster) stacks the same way, so the two show together.
- Reset times are formatted in the mod's own runtime. If they come out in UTC instead of your local time, that runtime doesn't know your time zone.
- To check it after editing: `claude plugin validate ~/.claude/mods/usage-meter`.
- `tsconfig.json` points at `.claude-plugin/types/`, which Claude Code generates and git ignores, so type-checking a fresh clone needs those files regenerated first.
