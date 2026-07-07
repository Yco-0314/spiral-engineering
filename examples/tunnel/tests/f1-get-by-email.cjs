;(async () => {
  const h = require('./_harness.cjs')(process.argv[2])
  const byEmail = h.findRoute(/by-?email/i)
  if (!byEmail) h.fail('no by-email route exposed')
  h.fixtures.rows = [{ id: 7, email: 'a@b.c', name: 'A' }]
  const u = await byEmail({ email: 'a@b.c' })
  if (!u || u.email !== 'a@b.c') h.fail('by-email route did not return the user')
  if (!h.calls.some(c => /email/i.test(c.sql))) h.fail('no query filtered by email')
  h.pass()
})().catch(e => { console.log('FAIL: ' + e.message); process.exit(1) })
