# Backend Deployment

B0 supplies local infrastructure and CI only. Production deployment is intentionally unverified until B8 chooses an environment and provisions managed PostgreSQL, Redis, object storage, secret management, monitoring, backups, and network controls.

Deployments must run immutable builds, migration validation, health checks, readiness gates, backward-compatible migrations, and rollback procedures. Provider credentials remain environment-managed. Live Flutterwave and GIG Logistics verification stays Blocked until credentials and certification access exist.

Customer authentication additionally requires a deployment-specific `AUTH_TOKEN_PEPPER`, public application URL, SMTP URL/from address, and reviewed session/verification/reset TTLs. The process-local authentication limiter is suitable for one API replica only; move it to Redis before horizontal scaling.

Administrator authentication additionally requires a deployment-specific 32-byte base64url `ADMIN_MFA_ENCRYPTION_KEY`, a reviewed admin cookie name/session TTL, and an MFA challenge TTL. Provision the first or additional staff account only from a trusted operator environment with `ADMIN_PROVISION_EMAIL`, `ADMIN_PROVISION_PASSWORD`, `ADMIN_PROVISION_NAME`, optional `ADMIN_PROVISION_ROLE`, and optional `ADMIN_PROVISION_MFA_REQUIRED`; run `pnpm --filter @tms/api admin:provision`, then remove the password variable from the environment. The RBAC seed must run before provisioning. Production administrators should keep MFA required. For a lost authenticator, set `ADMIN_MFA_RESET_EMAIL` in a trusted operator environment and run `pnpm --filter @tms/api admin:mfa-reset`; the command is audited, revokes every admin session/challenge, and forces enrollment on the next login.
