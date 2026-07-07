import { db } from './db'

export interface User { id: number; email: string; name: string }

export async function getUser(id: number): Promise<User | null> {
  const rows = await db.query('SELECT id, email, name FROM users WHERE id = $1', [id])
  return (rows[0] as User) ?? null
}

export async function createUser(email: string, name: string): Promise<User> {
  const rows = await db.query(
    'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name',
    [email, name],
  )
  return rows[0] as User
}

export async function deleteUser(id: number): Promise<void> {
  await db.query('DELETE FROM users WHERE id = $1', [id])
}
