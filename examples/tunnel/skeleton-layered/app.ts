import { SqlUserRepository } from './user-repository'
import { UserService } from './user-service'

const service = new UserService(new SqlUserRepository())

// Route table: path -> handler. (Framework-free stand-in for an HTTP server.)
export const routes: Record<string, (body: any) => Promise<unknown>> = {
  'GET /users/:id': ({ id }) => service.getUser(Number(id)),
  'POST /users': ({ email, name }) => service.createUser(email, name),
  'DELETE /users/:id': ({ id }) => service.deleteUser(Number(id)),
}
