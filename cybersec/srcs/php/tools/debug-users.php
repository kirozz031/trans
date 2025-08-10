<?php
try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->query("SELECT id, email, password FROM users");

    echo "Utilisateurs enregistrés :\n\n";
    foreach ($stmt as $row) {
        echo "ID: {$row['id']} | Email: {$row['email']} | Password: {$row['password']}\n";
    }

} catch (PDOException $e) {
    echo "Erreur : " . $e->getMessage();
}
