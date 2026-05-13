# Franchise Ice Agent Rules

- Keep game logic pure and testable.
- Do not use real NHL names, players, teams, logos, jerseys, or branding.
- Keep the current phase client-only; do not add backend, auth, cloud saves, or online services.
- Prefer small typed systems over giant components.
- Keep UI polished, readable, and grounded in the hockey-operations fantasy.
- Run tests and build before finishing.
- Save serializable franchise state only; never save renderer or browser objects.
- Keep free agency, full draft execution, playoffs, waivers, buyouts, retained salary, and full contract negotiations out of scope unless a later phase explicitly asks for them.
