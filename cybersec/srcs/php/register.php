<?php
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "Méthode non autorisée";
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email'], $data['password'])) {
    http_response_code(400);
    echo "Email et mot de passe requis";
    exit;
}

$email = $data['email'];
$password = password_hash($data['password'], PASSWORD_DEFAULT);

try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare("INSERT INTO users (email, password) VALUES (:email, :password)");
    $stmt->execute([
        ':email' => $email,
        ':password' => $password
    ]);

    echo "Utilisateur enregistré avec succès ✅";
} catch (PDOException $e) {
    if ($e->getCode() === "23000") {
        http_response_code(409);
        echo "Email déjà utilisé";
    } else {
        http_response_code(500);
        echo "Erreur : " . $e->getMessage();
    }
}
