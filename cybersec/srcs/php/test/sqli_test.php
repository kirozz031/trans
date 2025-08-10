<?php
header('Content-Type: text/plain');

$input = $_GET['query'] ?? '';

echo "Tu as envoyé : $input\n";
