<?php
header('Content-Type: text/plain');

if (isset($_GET['input'])) {
    echo "Tu as envoyé : " . $_GET['input'];
} else {
    echo "Rien reçu.";
}
