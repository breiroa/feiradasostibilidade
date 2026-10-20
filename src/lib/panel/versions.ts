// Historial de versións dos documentos (táboa versions)
import { db } from '../datos';

const MAX_VERSIONS = 30;

/** Sentenzas para gardar unha versión e deixar só as últimas MAX_VERSIONS de cada documento */
export function versionSQL(c: string, id: string, datos: string, autor: string | null, accion: string) {
  return [
    db().prepare('INSERT INTO versions (coleccion, doc_id, datos, autor, accion) VALUES (?, ?, ?, ?, ?)').bind(c, id, datos, autor, accion),
    db()
      .prepare('DELETE FROM versions WHERE coleccion = ? AND doc_id = ? AND id NOT IN (SELECT id FROM versions WHERE coleccion = ? AND doc_id = ? ORDER BY id DESC LIMIT ?)')
      .bind(c, id, c, id, MAX_VERSIONS),
  ];
}
