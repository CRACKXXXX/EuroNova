-- ============================================================
-- EuroNova — Migración 00007: Interacciones de Usuario y Reseñas de Organizaciones
-- ============================================================

-- 1. Tabla: user_project_interactions
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_project_interactions (
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  is_favorite BOOLEAN     NOT NULL DEFAULT false,
  is_applied  BOOLEAN     NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

COMMENT ON TABLE user_project_interactions IS 'Rastreo de proyectos guardados (favoritos) y postulados por usuario.';

-- Índices para optimizar búsquedas y filtros
CREATE INDEX IF NOT EXISTS idx_user_project_interactions_user 
  ON user_project_interactions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_project_interactions_project 
  ON user_project_interactions (project_id);
CREATE INDEX IF NOT EXISTS idx_user_project_interactions_fav 
  ON user_project_interactions (user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_project_interactions_app 
  ON user_project_interactions (user_id, is_applied) WHERE is_applied = true;

-- Habilitar Row Level Security (RLS)
ALTER TABLE user_project_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own interactions" ON user_project_interactions;
CREATE POLICY "Users can select own interactions"
  ON user_project_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own interactions" ON user_project_interactions;
CREATE POLICY "Users can insert own interactions"
  ON user_project_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own interactions" ON user_project_interactions;
CREATE POLICY "Users can update own interactions"
  ON user_project_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own interactions" ON user_project_interactions;
CREATE POLICY "Users can delete own interactions"
  ON user_project_interactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


-- 2. Tabla: org_reviews
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES users_org (id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES users_youth (id) ON DELETE CASCADE,
  rating      SMALLINT    NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_org_author_review UNIQUE (org_id, author_id)
);

COMMENT ON TABLE org_reviews IS 'Reseñas con rating y texto dejadas por jóvenes verificados sobre organizaciones.';

-- Índices para org_reviews
CREATE INDEX IF NOT EXISTS idx_org_reviews_org 
  ON org_reviews (org_id);
CREATE INDEX IF NOT EXISTS idx_org_reviews_author 
  ON org_reviews (author_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE org_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view org reviews" ON org_reviews;
CREATE POLICY "Anyone can view org reviews"
  ON org_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Youth author can insert org review" ON org_reviews;
CREATE POLICY "Youth author can insert org review"
  ON org_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Youth author can update org review" ON org_reviews;
CREATE POLICY "Youth author can update org review"
  ON org_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Youth author can delete org review" ON org_reviews;
CREATE POLICY "Youth author can delete org review"
  ON org_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);
