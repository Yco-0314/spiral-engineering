import { getUser, createUser, deleteUser } from './users'

// Route table: path -> handler. (Framework-free stand-in for an HTTP server.)
export const routes: Record<string, (body: any) => Promise<unknown>> = {
  'GET /users/:id': ({ id }) => getUser(Number(id)),
  'POST /users': ({ email, name }) => createUser(email, name),
  'DELETE /users/:id': ({ id }) => deleteUser(Number(id)),
}
