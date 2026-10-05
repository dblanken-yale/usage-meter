import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'usage-meter', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false } }
const USAGE = {
  startedAt: 0,
  context: { tokens: 84_000, window: 200_000, percent: 42 },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 2, resetsAt: '2026-10-05T20:10:00Z' },
    { kind: 'seven_day', percentUsed: 10, resetsAt: '2026-10-10T07:00:00Z' },
  ],
  cost: { usd: 1.23 },
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`draws usage and stacks the band beneath (${surface})`, async ($, on) => {
    on('ui.render', ($, e) => h($.ui.resolve(e).Text, {}, 'other mod row') as never)
    on('clock.now', () => ({ value: Date.parse('2026-10-05T12:00:00Z') }) as never)
    on('session.usage', () => ({ value: USAGE }) as never)
    on('session.measure', ($, e) => ({ changed: e.changed }) as never)

    await $.session.measure({ ...USAGE, changed: ['context', 'rateLimits', 'cost'] } as never)
    const band = await $.ui.mount({ ...BAND, surface } as never)
    expect(await band.find({ text: /42%/ })).toBeTruthy()
    expect(await band.find({ text: /84k\/200k/ })).toBeTruthy()
    expect(await band.find({ text: /\$1\.23/ })).toBeTruthy()
    expect(await band.find({ text: /other mod row/ })).toBeTruthy()
  })
}

test('reads usage at session start, before any measurement', async ($, on) => {
  on('ui.render', ($, e) => h($.ui.resolve(e).Text, {}, '') as never)
  on('clock.now', () => ({ value: 0 }) as never)
  on('session.usage', () => ({ value: USAGE }) as never)
  on('session.start', (_$, e) => e as never)

  await $.session.start({ source: 'startup', cwd: '/tmp' } as never)
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' } as never)
  expect(await band.find({ text: /42%/ })).toBeTruthy()
})
