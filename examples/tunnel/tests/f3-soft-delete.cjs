;(async () => {
  const h = require('./_harness.cjs')(process.argv[2])
  const del = h.findRoute(/DELETE \/users\/:id$/) || h.fail('no delete route')
  await del({ id: 3 })
  if (h.calls.some(c => /delete\s+from/i.test(c.sql))) h.fail('still hard-deletes (DELETE FROM)')
  if (!h.calls.some(c => /deleted_at/i.test(c.sql))) h.fail('no deleted_at write on delete')
  const get = h.findRoute(/GET \/users\/:id$/) || h.fail('no get route')
  h.fixtures.rows = []
  await get({ id: 3 })
  const lastRead = h.reads().slice(-1)[0]
  if (!lastRead || !/deleted_at/i.test(lastRead.sql)) h.fail('reads do not exclude soft-deleted rows')
  h.pass()
})().catch(e => { console.log('FAIL: ' + e.message); process.exit(1) })
