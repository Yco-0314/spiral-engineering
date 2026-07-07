// Minimal db client stub. db.query(sql, params) -> Promise<any[]>
export const db = {
  async query(sql: string, params: unknown[] = []): Promise<any[]> {
    void sql; void params
    return []
  },
}
