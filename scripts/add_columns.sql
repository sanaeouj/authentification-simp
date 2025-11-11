-- Ajouter les colonnes manquantes à la table magic_links
ALTER TABLE magic_links
ADD COLUMN voip_provider TEXT,
ADD COLUMN voip_number TEXT,
ADD COLUMN price_config TEXT,
ADD COLUMN notes TEXT;
