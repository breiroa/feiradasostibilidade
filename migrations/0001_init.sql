-- Esquema inicial da web da Feira da Sostibilidade (Cloudflare D1 / SQLite)

-- Contidos editables desde o panel: unha táboa xenérica por documento JSON.
-- coleccion: edicions | noticias | entidades | recursos | proxectos | paxinas | axustes
CREATE TABLE documentos (
  coleccion   TEXT NOT NULL,
  id          TEXT NOT NULL,
  datos       TEXT NOT NULL,              -- JSON validado no servidor
  orde        INTEGER NOT NULL DEFAULT 0,
  actualizado TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (coleccion, id)
);

-- Imaxes e ficheiros. O contido binario vai troceado en media_bloques
-- (D1 limita o tamaño de cada fila e de cada sentenza SQL).
CREATE TABLE media (
  id        TEXT PRIMARY KEY,
  tipo      TEXT NOT NULL,                -- MIME (image/webp, application/pdf…)
  nome      TEXT NOT NULL,                -- nome orixinal ou descritivo
  alt       TEXT NOT NULL DEFAULT '',
  etiqueta  TEXT NOT NULL DEFAULT 'xeral',-- xeral | logos | edicions | noticias | recursos | documentos
  ancho     INTEGER,
  alto      INTEGER,
  bytes     INTEGER NOT NULL DEFAULT 0,
  variantes TEXT NOT NULL DEFAULT 'g',    -- lista separada por comas: g (grande), m (miniatura), f (ficheiro)
  creado    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media_bloques (
  media_id TEXT NOT NULL,
  variante TEXT NOT NULL,
  n        INTEGER NOT NULL,
  datos    BLOB NOT NULL,
  PRIMARY KEY (media_id, variante, n)
);

-- Persoas que administran o panel
CREATE TABLE admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nome           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE COLLATE NOCASE,
  rol            TEXT NOT NULL DEFAULT 'admin',   -- superadmin | admin
  pass_hash      TEXT,                            -- PBKDF2 (NULL mentres o convite está pendente)
  totp           TEXT,                            -- segredo base32 (NULL ata activar 2FA)
  convite_hash   TEXT,
  convite_expira TEXT,
  ultimo_acceso  TEXT,
  creado         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sesions (
  id_hash      TEXT PRIMARY KEY,               -- sha256 do token da cookie
  admin_id     INTEGER NOT NULL,
  pendente_2fa INTEGER NOT NULL DEFAULT 1,
  totp_novo    TEXT,                           -- segredo provisional durante a activación de 2FA
  csrf         TEXT NOT NULL,
  expira       TEXT NOT NULL,
  creado       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Intentos (acceso ao panel e formularios públicos) para limitar abusos
CREATE TABLE intentos (
  clave TEXT NOT NULL,                         -- ex. "login:1.2.3.4" ou "form:1.2.3.4"
  ts    INTEGER NOT NULL
);
CREATE INDEX intentos_clave ON intentos(clave, ts);

-- Formularios de Participa
CREATE TABLE inscricions (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo   TEXT NOT NULL,                        -- centro | entidade | prensa | contacto
  datos  TEXT NOT NULL,                        -- JSON
  estado TEXT NOT NULL DEFAULT 'nova',         -- nova | vista | aceptada | descartada
  notas  TEXT NOT NULL DEFAULT '',
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
