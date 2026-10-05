import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit, Snapshot } from '../types'

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

const usage = atom({ plugin: 'usage-meter', key: 'usage' } as const, null)
const now = atom({ plugin: 'usage-meter', key: 'now' } as const, 0)

const colorFor = (pct: number) => (pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green')

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayTimeFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

// Clock time of the reset; weekday only when it is not within the next ~day.
function resetAt(limit: Limit, t: number) {
  if (!limit.resetsAt) return ''
  const at = Date.parse(limit.resetsAt)
  return (at - t > 20 * 3_600_000 ? dayTimeFmt : timeFmt).format(at)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    const [{ context, rateLimits, cost }, t0] = await Promise.all([$.session.usage(), $.clock.now()])
    const snap: Snapshot = { context, rateLimits, cost }
    await update($, usage, () => snap)
    await update($, now, () => t0)
    $.clock.every(60_000, async () => {
      const t = await $.clock.now()
      await update($, now, () => t)
    })
    return started
  })

  on('session.measure', async ($, e, next) => {
    const snap: Snapshot = { context: e.context, rateLimits: e.rateLimits, cost: e.cost }
    await update($, usage, () => snap)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Stack on whatever the next plugin (e.g. cache-buster) draws instead of hiding it.
    const below = await next(e)
    const u = await read($, usage)
    if (e.props.hasSurvey || u === null) return below

    const t = await read($, now)
    const { Box, Text } = $.ui.resolve(e)

    const meter = (key: string, label: string, pct: number, suffix = '') => {
      const color = colorFor(pct)
      return (
        <Box key={key}>
          <Text bold>{label} </Text>
          <Text color={color}>{Math.round(pct)}%</Text>
          {suffix ? <Text dimColor> {suffix}</Text> : null}
        </Box>
      )
    }

    const ctxPct = u.context.percent ?? 0
    const ctxK = u.context.tokens ? `${Math.round(u.context.tokens / 1000)}k/${Math.round(u.context.window / 1000)}k` : ''

    const sections = [
      meter('ctx', 'ctx', ctxPct, ctxK),
      ...u.rateLimits.map(l => meter(l.kind, LABELS[l.kind] ?? l.kind, l.percentUsed, resetAt(l, t))),
      ...(u.cost ? [<Text key="cost" bold>${u.cost.usd.toFixed(2)}</Text>] : []),
    ]

    return (
      // A little space under the band above (cache-buster); on the terminal a step is a whole blank row, so skip it there.
      <Box flexDirection="column" paddingTop={e.surface === 'terminal' ? 0 : 1}>
        <Box>
          <Text color={colorFor(ctxPct)}>● </Text>
          {sections.flatMap((section, i) => (i ? [<Text key={`sep${i}`} dimColor>{'  │  '}</Text>, section] : [section]))}
        </Box>
        {below}
      </Box>
    )
  })
}
