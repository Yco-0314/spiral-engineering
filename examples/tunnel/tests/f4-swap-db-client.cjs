;(async () => {
  const h = require('./_harness.cjs')(process.argv[2])
  // old API must be GONE: any call to db.query fails the run
  const dbm = require(require('node:path').resolve(process.argv[2], 'db.js'))
  dbm.db.query = async () => { throw new Error('old db.query API used') }
  h.fixtures.rows = [{ id: 2, email: 'x@y.z', name: 'X' }]
  const get = h.findRoute(/GET \/users\/:id$/) || h.fail('no get route')
  const u = await get({ id: 2 })
  if (!u || u.id !== 2) h.fail('get-user does not work on the new execute API')
  if (!h.calls.some(c => c.api === 'execute')) h.fail('db.execute never called')
  h.pass()
})().catch(e => { console.log('FAIL: ' + e.message); process.exit(1) })
