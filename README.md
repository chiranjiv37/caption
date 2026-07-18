# Captions Studio

A video caption editing and management platform.

## Project Structure

```
/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   └── ...
└── backend/          # Backend API (to be implemented)
    └── README.md
```

## Frontend

The frontend is a Next.js application with:
- Projects management
- Series organization
- Caption editor with video player
- Export functionality (SRT, VTT, TXT, burned-in video)

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

### Building

```bash
cd frontend
npm run build
```

## Backend

The backend API is planned but not yet implemented. See `backend/README.md` for details.

## Database

create db
```
Step 1. Create the directories
mkdir -p /storage5/caption/postgres/data
sudo chown -R postgres:postgres /storage5/caption/postgres

Step 2. Initialize the database cluster
sudo -u postgres /usr/lib/postgresql/16/bin/initdb \
    -D /storage5/caption/postgres/data

Step 3. Start PostgreSQL
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl \
    -D /storage5/caption/postgres/data \
    -l /storage5/caption/postgres/postgres.log \
    start

Step 4. create db
psql -U postgres
CREATE DATABASE captions_studio;

Stept 5. 
CREATE ROLE captions_user WITH LOGIN PASSWORD 'chiranjiv';
ALTER ROLE captions_user CREATEDB;
ALTER DATABASE captions_studio OWNER TO captions_user;
GRANT ALL PRIVILEGES ON DATABASE captions_studio TO captions_user;
\q

Step 6. if new database then run this command to create table in database
python -m alembic upgrade head

```

## License

Private