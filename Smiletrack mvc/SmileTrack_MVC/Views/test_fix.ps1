$file = "c:\Users\nohor\Downloads\Smiletrack final 0.1 (Organizado)\SmileTrack_MVC\Views\Gestion_De_Profesionales\st-odo-08-mis-reportes\mis-reportes.html"

# Read as UTF8 (the way it is saved now)
$corruptedText = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Convert to bytes using Windows-1252
$isoEncoding = [System.Text.Encoding]::GetEncoding(1252)
$bytes = $isoEncoding.GetBytes($corruptedText)

# Decode bytes using UTF-8
$fixedText = [System.Text.Encoding]::UTF8.GetString($bytes)

# Write to a temp file to verify
$tempFile = "c:\Users\nohor\Downloads\Smiletrack final 0.1 (Organizado)\SmileTrack_MVC\Views\test_mis_reportes.html"
[System.IO.File]::WriteAllText($tempFile, $fixedText, [System.Text.Encoding]::UTF8)
Write-Host "Test generated"
