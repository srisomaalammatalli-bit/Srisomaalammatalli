-- =========================================================
-- Migration 013 — Correct temple name in settings
--
-- The temple's proper name is "Sri Somaalamma Talli Temple",
-- not the domain-style "Srisomaalammatalli Temple" that was
-- seeded originally. This updates the settings table so the
-- header, footer, and all public pages show the correct name.
-- =========================================================

UPDATE settings SET value = '"Sri Somaalamma Talli Temple"'
WHERE key = 'temple_name' AND value LIKE '%Srisomaalammatalli%';

UPDATE settings SET value = '"Sri Somaalamma Talli Temple, Munjavarapu Kottu, Mungandapalem, P. Gannavaram Mandal, Dr. B. R. Ambedkar Konaseema District, Andhra Pradesh 533214"'
WHERE key = 'temple_address' AND value LIKE '%Srisomaalammatalli%';
