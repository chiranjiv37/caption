# Database Migration

When modifying the database:

1. Update SQLAlchemy models.
2. Generate Alembic migration.
3. Review generated migration.
4. Check backward compatibility.
5. Consider indexes.
6. Consider nullable fields.
7. Consider existing production data.

Never generate destructive migrations without warning.
