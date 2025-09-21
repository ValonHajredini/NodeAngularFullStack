# Development Credentials

## pgWeb (Database UI)
- URL: http://localhost:8080
- Basic Auth: `admin` / `pgweb_dev_password_2024`
- Default Connection (inside Docker network):
  - Host: `postgres`
  - Port: `5432`
  - Database: `nodeangularfullstack`
  - Username: `dbuser`
  - Password: `dbpassword`
  - SSL Mode: `disable`
- If you are connecting directly from your host machine (psql, GUI clients), use `localhost` for the host with the same port, database, username, and password.

## PostgreSQL (direct access)
- Host: `localhost`
- Port: `5432`
- Database: `nodeangularfullstack`
- Username: `dbuser`
- Password: `dbpassword`

## Seeded Application Users
- Admin: `admin@example.com` / `Admin123!@#`
- Standard User: `user@example.com` / `User123!@#`
- Read-only User: `readonly@example.com` / `Read123!@#`
- Inactive User: `inactive@example.com` / `Inactive123!@#`
- Unverified User: `unverified@example.com` / `Unverified123!@#`

> These values come from the root `.env` and `apps/api/.env` files. Update this document if you change the underlying environment variables.
