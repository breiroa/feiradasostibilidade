-- Último paso TOTP usado por cada admin (impide reutilizar o mesmo código dúas veces)
ALTER TABLE admins ADD COLUMN totp_paso INTEGER NOT NULL DEFAULT 0;
