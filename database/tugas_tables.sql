-- =============================================
-- SQL QUERIES UNTUK TABEL TUGAS/PROJECTS
-- Execute queries ini di database PostgreSQL Anda
-- =============================================

-- 1. TABEL PROJECTS (Proyek utama)
CREATE TABLE IF NOT EXISTS "public"."projects" (
  "id" VARCHAR(50) PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "category" VARCHAR(50) NOT NULL DEFAULT 'laser_cutting_metal',
  "initial_deadline_days" NUMERIC(10,4) NULL DEFAULT 0,
  "actual_deadline_days" NUMERIC(10,4) NULL DEFAULT 0,
  "start_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "end_date" TIMESTAMP NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chk_project_category" CHECK (category IN ('laser_cutting_metal', 'laser_non_metal', 'cnc_router', 'ai')),
  CONSTRAINT "chk_project_status" CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- 2. TABEL TEAM_MEMBERS (Anggota tim per proyek)
CREATE TABLE IF NOT EXISTS "public"."team_members" (
  "id" SERIAL PRIMARY KEY,
  "project_id" VARCHAR(50) NOT NULL,
  "member_id" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fk_team_member_project" FOREIGN KEY ("project_id")
    REFERENCES "public"."projects" ("id") ON DELETE CASCADE
);

-- 3. TABEL TASKS (Tugas individual)
CREATE TABLE IF NOT EXISTS "public"."tasks" (
  "id" VARCHAR(50) PRIMARY KEY,
  "project_id" VARCHAR(50) NOT NULL,
  "team_member_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "estimated_days" NUMERIC(10,4) NULL DEFAULT 0,
  "actual_days" NUMERIC(10,4) NULL DEFAULT 0,
  "start_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fk_task_project" FOREIGN KEY ("project_id")
    REFERENCES "public"."projects" ("id") ON DELETE CASCADE,
  CONSTRAINT "fk_task_team_member" FOREIGN KEY ("team_member_id")
    REFERENCES "public"."team_members" ("id") ON DELETE CASCADE
);

-- 4. INDEXES untuk performa query
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "public"."projects" ("status");
CREATE INDEX IF NOT EXISTS "idx_projects_category" ON "public"."projects" ("category");
CREATE INDEX IF NOT EXISTS "idx_projects_created" ON "public"."projects" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_team_members_project" ON "public"."team_members" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_project" ON "public"."tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_team_member" ON "public"."tasks" ("team_member_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_completed" ON "public"."tasks" ("completed");

-- 5. VIEW untuk statistik proyek (opsional, berguna untuk dashboard)
CREATE OR REPLACE VIEW "public"."project_stats" AS
SELECT
  p.id,
  p.name,
  p.category,
  p.status,
  p.start_date,
  p.end_date,
  COUNT(DISTINCT tm.id) AS total_members,
  COUNT(t.id) AS total_tasks,
  COUNT(CASE WHEN t.completed = true THEN 1 END) AS completed_tasks,
  CASE
    WHEN COUNT(t.id) = 0 THEN 0
    ELSE ROUND((COUNT(CASE WHEN t.completed = true THEN 1 END)::NUMERIC / COUNT(t.id)) * 100, 2)
  END AS progress_percentage
FROM projects p
LEFT JOIN team_members tm ON p.id = tm.project_id
LEFT JOIN tasks t ON tm.id = t.team_member_id
GROUP BY p.id, p.name, p.category, p.status, p.start_date, p.end_date;

-- =============================================
-- CONTOH DATA (Opsional - untuk testing)
-- =============================================

-- Insert sample project
-- INSERT INTO projects (id, name, category, initial_deadline_days, actual_deadline_days, start_date, end_date, status)
-- VALUES ('1703123456789', 'Test Project', 'laser_cutting_metal', 7, 7, '2025-12-20', '2025-12-27', 'active');

-- Insert sample team members
-- INSERT INTO team_members (project_id, member_id, name) VALUES ('1703123456789', '1', 'RUDY');
-- INSERT INTO team_members (project_id, member_id, name) VALUES ('1703123456789', '2', 'DOMAN');
-- INSERT INTO team_members (project_id, member_id, name) VALUES ('1703123456789', '3', 'KOJEK');
