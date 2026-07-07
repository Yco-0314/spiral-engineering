import { UserRepository, User } from './user-repository'

export class UserService {
  constructor(private repo: UserRepository) {}
  getUser(id: number): Promise<User | null> { return this.repo.findById(id) }
  createUser(email: string, name: string): Promise<User> { return this.repo.insert(email, name) }
  deleteUser(id: number): Promise<void> { return this.repo.remove(id) }
}
