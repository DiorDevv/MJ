# TLS certificates

Put your production certificate here before running with `docker-compose.prod.yml`:

- `fullchain.pem`
- `privkey.pem`

Both `*.pem` files are gitignored — never commit real private keys.

## Getting a certificate

**Real domain (recommended):** use [certbot](https://certbot.eff.org/) in
webroot mode, pointed at the `certbot_webroot` volume that
`docker-compose.prod.yml` already mounts at `/var/www/certbot` in the nginx
container (matches the `/.well-known/acme-challenge/` location in
`nginx/nginx.prod.conf`):

```bash
certbot certonly --webroot -w /path/to/certbot_webroot -d yourdomain.example
cp /etc/letsencrypt/live/yourdomain.example/fullchain.pem nginx/certs/
cp /etc/letsencrypt/live/yourdomain.example/privkey.pem nginx/certs/
```

Renew periodically (e.g. a monthly cron calling `certbot renew` followed by a
`docker compose restart nginx`) since Let's Encrypt certs expire every 90 days.

**No domain yet / local HTTPS testing:** generate a self-signed certificate —
browsers will show a trust warning, but the connection is still encrypted:

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/CN=localhost"
```
