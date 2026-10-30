-- Prevent a username from being reused by accounts with different portal roles.
DROP INDEX IF EXISTS "users_username_role_key";

-- Retain one account per username before enforcing the new constraint.
-- Prefer the administrator-facing `user` role, then the oldest account.
WITH ranked_users AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY "username"
      ORDER BY
        CASE "role"
          WHEN 'user' THEN 0
          WHEN 'technician' THEN 1
          ELSE 2
        END,
        "createdAt" ASC
    ) AS row_number
  FROM "users"
)
DELETE FROM "users" AS duplicate
USING ranked_users
WHERE duplicate.ctid = ranked_users.ctid
  AND ranked_users.row_number > 1;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
