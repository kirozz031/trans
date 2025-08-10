<?php
$dbFile = '/var/www/html/data/users.sqlite';

// Assure-toi que le dossier est accessible
if (!is_writable(dirname($dbFile))) {
    die("❌ Erreur : Le dossier " . dirname($dbFile) . " n'est pas accessible en écriture.\n");
}

// Supprime l'ancienne DB si elle est en lecture seule
if (file_exists($dbFile)) {
    unlink($dbFile);
}

// Crée la base
try {
    $db = new PDO('sqlite:' . $dbFile);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Donne les droits immédiatement après création
    chmod($dbFile, 0666);  // lecture/écriture pour tous (à restreindre selon usage réel)

    $sql = "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            is_2fa_enabled INTEGER DEFAULT 0,
            twofa_secret TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ";
    if (!is_writable(dirname($dbFile))) {
        die("❌ Erreur : Le dossier " . dirname($dbFile) . " n'est pas accessible en écriture.\n");
    }
    $db->exec($sql);
    echo "✅ Base de données et table 'users' créées avec succès\n";

} catch (PDOException $e) {
    echo "❌ Erreur : " . $e->getMessage();
}

