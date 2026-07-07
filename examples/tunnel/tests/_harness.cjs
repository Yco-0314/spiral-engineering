// Shared probe harness. Usage inside a test: const h = require('./_harness.cjs')(buildDir)
// Spies on the db stub BOTH skeletons export, so probes work through the stable route surface
// regardless of internal shape (functions vs repository/service).
module.exports = (buildDir) => {
  const path = require('node:path')
  const dbm = require(path.resolve(buildDir, 'db.js'))
  const calls = []
  const fixtures = { rows: [] }
  dbm.db.query = async (sql, params = []) => { calls.push({ api: 'query', sql: String(sql), params }); return fixtures.rows }
  dbm.db.execute = async (arg = {}) => { calls.push({ api: 'execute', sql: String(arg.sql || ''), params: arg.params || [] }); return { rows: fixtures.rows } }
  const { routes } = require(path.resolve(buildDir, 'app.js'))
  const findRoute = (re) => { const k = Object.keys(routes).find(k => re.test(k)); return k ? routes[k] : null }
  const reads = () => calls.filter(c => /select/i.test(c.sql))
  const fail = (msg) => { console.log('FAIL: ' + msg); process.exit(1) }
  const pass = () => { console.log('PASS'); process.exit(0) }
  return { routes, findRoute, calls, fixtures, reads, fail, pass }
}
