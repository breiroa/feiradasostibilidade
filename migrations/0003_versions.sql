-- Historial de cambios: cada gardado e cada borrado deixa unha versión do documento
CREATE TABLE versions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  coleccion TEXT NOT NULL,
  doc_id    TEXT NOT NULL,
  datos     TEXT NOT NULL,
  autor     TEXT,                                 -- nome da persoa que gardou (texto, por se se borra a conta)
  accion    TEXT NOT NULL DEFAULT 'gardado',      -- orixinal | creado | gardado | restaurado | borrado
  creado    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX versions_doc ON versions (coleccion, doc_id, id);

-- Quen fixo o último cambio de cada documento
ALTER TABLE documentos ADD COLUMN editado_por TEXT;
