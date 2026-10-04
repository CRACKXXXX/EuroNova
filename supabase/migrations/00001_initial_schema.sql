-- ============================================================
-- EuroNova — Esquema inicial de base de datos
-- PostgreSQL 15+ (Supabase)
-- Ejecutar en el SQL Editor de Supabase o como migración
-- ============================================================

-- 0. Extensiones necesarias
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- gen_random_uuid()

-- 1. Tipos ENUM personalizados
-- --------------------------------------------------------
CREATE TYPE project_type AS ENUM (
  'ESC',
  'Youth Exchange',
  'Training'
);

CREATE TYPE application_status AS ENUM (
  'pending',
  'accepted',
  'rejected'
);

-- 2. Tablas
-- ============================================================

-- 2.1 Perfil de jóvenes
-- --------------------------------------------------------
CREATE TABLE users_youth (
  id          UUID        PRIMARY KEY
                          REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  birth_date  DATE        NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  is_rup_region BOOLEAN   NOT NULL DEFAULT FALSE,
  interests   TEXT[]      DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users_youth IS 'Perfiles de jóvenes participantes en programas europeos.';
COMMENT ON COLUMN users_youth.country_code  IS 'Código ISO 3166-1 alpha-2 del país de residencia.';
COMMENT ON COLUMN users_youth.is_rup_region IS 'Indica si el joven reside en una región ultraperiférica (RUP).';

-- 2.2 Perfil de organizaciones
-- --------------------------------------------------------
CREATE TABLE users_org (
  id          UUID        PRIMARY KEY
                          REFERENCES auth.users (id) ON DELETE CASCADE,
  org_name    TEXT        NOT NULL,
  pic_number  VARCHAR(9)  NOT NULL UNIQUE,
  country_hq  VARCHAR(2)  NOT NULL,
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users_org IS 'Organizaciones acreditadas ante la Comisión Europea.';
COMMENT ON COLUMN users_org.pic_number IS 'Participant Identification Code de 9 dígitos asignado por la CE.';

-- 2.3 Proyectos de movilidad
-- --------------------------------------------------------
CREATE TABLE projects (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID          NOT NULL
                                  REFERENCES users_org (id) ON DELETE CASCADE,
  project_type      project_type  NOT NULL,
  title             TEXT          NOT NULL,
  description       TEXT          NOT NULL DEFAULT '',
  dest_country      VARCHAR(2)   NOT NULL,
  min_age           INT           NOT NULL CHECK (min_age >= 0),
  max_age           INT           NOT NULL CHECK (max_age >= 0),
  eligible_countries TEXT[]       DEFAULT '{}',
  covers_rup_flights BOOLEAN     NOT NULL DEFAULT FALSE,
  is_last_minute    BOOLEAN       NOT NULL DEFAULT FALSE,
  official_url      TEXT,
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  status            VARCHAR(20)   NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT chk_age_range CHECK (min_age <= max_age)
);

COMMENT ON TABLE  projects IS 'Proyectos de movilidad europea (ESC, Intercambios Juveniles, Formación).';
COMMENT ON COLUMN projects.covers_rup_flights IS 'Indica si el proyecto cubre vuelos desde regiones ultraperiféricas.';
COMMENT ON COLUMN projects.is_last_minute     IS 'Proyecto publicado como última hora con plazos reducidos.';

-- 2.4 Solicitudes de participación
-- --------------------------------------------------------
CREATE TABLE applications (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID                NOT NULL
                                  REFERENCES projects (id) ON DELETE CASCADE,
  youth_id    UUID                NOT NULL
                                  REFERENCES users_youth (id) ON DELETE CASCADE,
  status      application_status  NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),

  CONSTRAINT uq_application UNIQUE (project_id, youth_id)
);

COMMENT ON TABLE applications IS 'Solicitudes de jóvenes a proyectos de movilidad.';

-- 2.5 Reseñas de organizaciones
-- --------------------------------------------------------
CREATE TABLE reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID    NOT NULL
                      REFERENCES users_org (id) ON DELETE CASCADE,
  youth_id    UUID    NOT NULL
                      REFERENCES users_youth (id) ON DELETE CASCADE,
  rating      INT     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT    NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_review UNIQUE (org_id, youth_id)
);

COMMENT ON TABLE reviews IS 'Valoraciones que los jóvenes dejan sobre las organizaciones tras completar un proyecto.';

-- 3. Índices para consultas frecuentes
-- ============================================================
CREATE INDEX idx_projects_org_id        ON projects     (org_id);
CREATE INDEX idx_projects_type_status   ON projects     (project_type, status);
CREATE INDEX idx_projects_dest_country  ON projects     (dest_country);
CREATE INDEX idx_projects_last_minute   ON projects     (is_last_minute) WHERE is_last_minute = TRUE;

CREATE INDEX idx_applications_project   ON applications (project_id);
CREATE INDEX idx_applications_youth     ON applications (youth_id);
CREATE INDEX idx_applications_status    ON applications (status);

CREATE INDEX idx_reviews_org            ON reviews      (org_id);
CREATE INDEX idx_reviews_youth          ON reviews      (youth_id);

-- 4. Row Level Security (RLS)
-- ============================================================

-- --------------------------------------------------------
-- 4.1 projects
-- --------------------------------------------------------
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Lectura pública de proyectos"
  ON projects FOR SELECT
  USING (TRUE);

-- Inserción solo por la organización propietaria
CREATE POLICY "Organización inserta sus proyectos"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = org_id);

-- Edición solo por la organización propietaria
CREATE POLICY "Organización edita sus proyectos"
  ON projects FOR UPDATE
  USING (auth.uid() = org_id)
  WITH CHECK (auth.uid() = org_id);

-- Borrado solo por la organización propietaria
CREATE POLICY "Organización elimina sus proyectos"
  ON projects FOR DELETE
  USING (auth.uid() = org_id);

-- --------------------------------------------------------
-- 4.2 users_youth
-- --------------------------------------------------------
ALTER TABLE users_youth ENABLE ROW LEVEL SECURITY;

-- Perfil público de lectura
CREATE POLICY "Lectura pública de perfil joven"
  ON users_youth FOR SELECT
  USING (TRUE);

-- Solo el dueño edita su perfil
CREATE POLICY "Joven edita su perfil"
  ON users_youth FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Solo el dueño inserta su perfil
CREATE POLICY "Joven crea su perfil"
  ON users_youth FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Solo el dueño elimina su perfil
CREATE POLICY "Joven elimina su perfil"
  ON users_youth FOR DELETE
  USING (auth.uid() = id);

-- --------------------------------------------------------
-- 4.3 users_org
-- --------------------------------------------------------
ALTER TABLE users_org ENABLE ROW LEVEL SECURITY;

-- Perfil público de lectura
CREATE POLICY "Lectura pública de perfil organización"
  ON users_org FOR SELECT
  USING (TRUE);

-- Solo el dueño edita su perfil
CREATE POLICY "Organización edita su perfil"
  ON users_org FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Solo el dueño inserta su perfil
CREATE POLICY "Organización crea su perfil"
  ON users_org FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Solo el dueño elimina su perfil
CREATE POLICY "Organización elimina su perfil"
  ON users_org FOR DELETE
  USING (auth.uid() = id);

-- --------------------------------------------------------
-- 4.4 applications
-- --------------------------------------------------------
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- El joven ve sus propias solicitudes
CREATE POLICY "Joven ve sus solicitudes"
  ON applications FOR SELECT
  USING (auth.uid() = youth_id);

-- La organización dueña del proyecto ve las solicitudes recibidas
CREATE POLICY "Organización ve solicitudes de sus proyectos"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
        AND projects.org_id = auth.uid()
    )
  );

-- Solo el joven crea su solicitud
CREATE POLICY "Joven envía solicitud"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = youth_id);

-- Solo la organización dueña puede cambiar el estado
CREATE POLICY "Organización actualiza estado de solicitud"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
        AND projects.org_id = auth.uid()
    )
  );

-- --------------------------------------------------------
-- 4.5 reviews
-- --------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Lectura pública de reseñas
CREATE POLICY "Lectura pública de reseñas"
  ON reviews FOR SELECT
  USING (TRUE);

-- Solo un joven con solicitud aceptada en esa organización puede insertar
CREATE POLICY "Joven con solicitud aceptada inserta reseña"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = youth_id
    AND EXISTS (
      SELECT 1
      FROM applications a
        JOIN projects p ON p.id = a.project_id
      WHERE a.youth_id  = youth_id
        AND p.org_id    = reviews.org_id
        AND a.status    = 'accepted'
    )
  );

-- Solo el autor puede editar su reseña
CREATE POLICY "Joven edita su reseña"
  ON reviews FOR UPDATE
  USING (auth.uid() = youth_id)
  WITH CHECK (auth.uid() = youth_id);

-- Solo el autor puede eliminar su reseña
CREATE POLICY "Joven elimina su reseña"
  ON reviews FOR DELETE
  USING (auth.uid() = youth_id);

-- ============================================================
-- Fin del esquema inicial de EuroNova
-- ============================================================
