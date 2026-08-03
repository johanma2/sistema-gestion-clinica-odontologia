# Script to trigger recover send-code and query DB
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-WebRequest -Uri 'http://localhost:5258/acceso-y-seguridad/recover' -WebSession $s -UseBasicParsing | Out-Null
$tokenCookie = $s.Cookies.GetCookies('http://localhost') | Where-Object { $_.Name -eq 'XSRF-TOKEN' }
$token = $tokenCookie.Value
Write-Output "XSRF Token: $token"
$json = @{ correo='admin@smiletrack.co' } | ConvertTo-Json
$hdr = @{ 'X-CSRF-TOKEN' = $token }
try {
    $resp = Invoke-RestMethod -Uri 'http://localhost:5258/acceso-y-seguridad/recover/send-code' -Method Post -Body $json -ContentType 'application/json' -Headers $hdr -WebSession $s -UseBasicParsing -ErrorAction Stop
    Write-Output "Response: $($resp | ConvertTo-Json -Depth 5)"
} catch {
    if ($_.Exception.Response -ne $null) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
        Write-Output "Request failed (status >=400). Response body:";
        Write-Output $body
    } else {
        Write-Output "Request failed: $_"
    }
}

# Query DB for latest CodigoRecuperacion for admin@smiletrack.co
$cs = "Server=(localdb)\\mssqllocaldb;Database=SmileTrackDB;Trusted_Connection=True;TrustServerCertificate=True;"
$query = @"
SELECT TOP(1) c.id_codigo, c.id_usuario, c.codigo_hash, c.fecha_creacion, c.fecha_expiracion, c.intentos_fallidos, c.usado, c.ip_origen
FROM CodigoRecuperacion c
JOIN Usuario u ON u.id_usuario = c.id_usuario
WHERE u.correo = 'admin@smiletrack.co'
ORDER BY c.fecha_creacion DESC
"@

$cn = New-Object System.Data.SqlClient.SqlConnection $cs
$cn.Open()
$cmd = $cn.CreateCommand()
$cmd.CommandText = $query
$reader = $cmd.ExecuteReader()
if ($reader.Read()) {
    Write-Output "Found CodigoRecuperacion:" 
    Write-Output "id_codigo: $($reader['id_codigo'])"
    Write-Output "id_usuario: $($reader['id_usuario'])"
    Write-Output "codigo_hash: $($reader['codigo_hash'])"
    Write-Output "fecha_creacion: $($reader['fecha_creacion'])"
    Write-Output "fecha_expiracion: $($reader['fecha_expiracion'])"
    Write-Output "intentos_fallidos: $($reader['intentos_fallidos'])"
    Write-Output "usado: $($reader['usado'])"
    Write-Output "ip_origen: $($reader['ip_origen'])"
} else {
    Write-Output "No CodigoRecuperacion found for admin@smiletrack.co"
}
$reader.Close()
$cn.Close()
