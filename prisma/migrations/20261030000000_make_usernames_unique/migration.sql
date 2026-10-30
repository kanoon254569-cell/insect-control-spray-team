-- Prevent a username from being reused by accounts with different portal roles.
DROP INDEX "users_username_role_key";

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
