# Backend Deployment

B0 supplies local infrastructure and CI only. Production deployment is intentionally unverified until B8 chooses an environment and provisions managed PostgreSQL, Redis, object storage, secret management, monitoring, backups, and network controls.

Deployments must run immutable builds, migration validation, health checks, readiness gates, backward-compatible migrations, and rollback procedures. Provider credentials remain environment-managed. Live Flutterwave and GIG Logistics verification stays Blocked until credentials and certification access exist.

Customer authentication additionally requires a deployment-specific `AUTH_TOKEN_PEPPER`, public application URL, SMTP URL/from address, and reviewed session/verification/reset TTLs. The process-local authentication limiter is suitable for one API replica only; move it to Redis before horizontal scaling.
