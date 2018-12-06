<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (empty($_POST)) {
	return;
}

$name = $_POST['name'];
$type = $_POST['type'];
$wkt = $_POST['coordinates'];

$link = pg_connect("host=osgeolive user=user password=user dbname=tp-integrador");

$query = <<< EOD
INSERT INTO cervecerias_artesanales(nombre, tipo, geom)
VALUES ('$name', '$type', ST_geomfromtext('$wkt', 4326))
EOD;

$result = pg_query($query);

echo pg_result_status($result);
