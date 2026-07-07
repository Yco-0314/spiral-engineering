;(async () => {
  const h = require('./_harness.cjs')(process.argv[2])
  const get = h.findRoute(/GET \/users\/:id$/) || h.fail('no get-user route')
  h.fixtures.rows = [{ id: 1, email: 'x@y.z', name: 'X' }]
  await get({ id: 1 }); await get({ id: 1 })
  if (h.reads().length !== 1) h.fail(`expected 1 SELECT for two reads (cache), saw ${h.reads().length}`)
  const del = h.findRoute(/DELETE \/users\/:id$/) || h.fail('no delete route')
  await del({ id: 1 })
  await get({ id: 1 })
  if (h.reads().length !== 2) h.fail('delete did not invalidate the cache')
  h.pass()
})().catch(e => { console.log('FAIL: ' + e.message); process.exit(1) })
