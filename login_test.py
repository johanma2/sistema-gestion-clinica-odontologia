import http.cookiejar, urllib.request, urllib.parse, re, sys
url = 'http://localhost:5000/acceso-y-seguridad/login?ReturnUrl=/gestion-de-citas/st-pac-01-mis-citas'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
req = urllib.request.Request(url, headers={'User-Agent': 'python-urllib/3'})
res = opener.open(req)
html = res.read().decode('utf-8', errors='ignore')
m = re.search(r'name="__RequestVerificationToken" value="([^"]+)"', html)
print('GET status', res.status)
print('token found', bool(m))
if not m:
    sys.exit(1)
token = m.group(1)
print('token', token[:30])
data = urllib.parse.urlencode({
    'email': 'pac@smiletrack.co',
    'password': '123456',
    'rol': 'Paciente',
    'returnUrl': '/gestion-de-citas/st-pac-01-mis-citas',
    '__RequestVerificationToken': token
}).encode('utf-8')
req2 = urllib.request.Request('http://localhost:5000/acceso-y-seguridad/login', data=data, headers={'User-Agent': 'python-urllib/3', 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'})
res2 = opener.open(req2)
body = res2.read().decode('utf-8', errors='ignore')
print('POST status', res2.status)
print('Headers', res2.getheaders())
print('Body', body)
