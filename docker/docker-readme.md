# Toolbox - Docker deployment via Portainer

This guide describes how to roll out Toolbox with Docker and Portainer.

## 1. Create the stack

1. In Portainer, go to **Stacks**.
2. Click **Add stack**.
3. Give the stack a name, for example: `toolbox`
4. Under **Build method**, choose **Web editor**.
5. Paste the contents of [docker-compose.ghcr.yml](docker/docker-compose.ghcr.yml) into the editor.

## 2. Set the environment variables

Add the following environment variables at the bottom of the stack editor. They are listed under [.env.example](docker/.env.example).

You might need to set the upload file type to "all" when uploading.

| Name             | Required | Value                                                      |
| ---------------- | -------- | ------------------------------------------------------------ |
| `ADMIN_PASSWORD` | Yes      | A strong administrator password                              |
| `TOOLBOX_PORT`   | No       | `8080` or another free port on the host (default `8080`)     |
| `IMAGE_TAG`      | No       | `latest` (default), a specific version (`v0.9.5`)     |
| `TRUST_PROXY`    | No       | Set to `1` when a reverse proxy sits in front                 |

Example:

```text
ADMIN_PASSWORD=use-a-strong-password
TOOLBOX_PORT=8080
IMAGE_TAG=latest
```

If a reverse proxy sits in front, set `TRUST_PROXY=1`. Without it the rate limiter sees the proxy's IP instead of the visitor's, so all users share a single limit.

## 3. Deploy the stack

1. Click **Deploy the stack**.
2. Open Toolbox in the browser at:

```text
http://<ip>:<TOOLBOX_PORT>
```

Example:

```text
http://192.168.1.100:8080
```

## Persistent data

Toolbox uses four named volumes to keep data across updates and redeployments.

Do not remove the stack in Portainer together with its volumes, unless you really want to wipe the database, backups and temporary restore files.

| Volume            | Mountpoint      | Contents                                                                                                                                         |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `toolbox_db`      | `/data/db`      | `toolbox.db`, the SQLite database                                                                                                                |
| `toolbox_backups` | `/data/backups` | Daily automatic backups and safety backups for restores                                                                                          |
| `toolbox_temp`    | `/data/temp`    | Temporary database restore uploads. This data may be lost                                                                                        |
| `toolbox_logs`    | `/data/logs`    | Unused - kept for compatibility. Application/system/security events are now stored in the database and visible under Admin Center's Logging tab. |

## Updating to a new version

For update the stack through Portainer:

1. Open the stack in Portainer.
2. Choose **Pull and redeploy**.

Or:

1. Choose **Update the stack**.
2. Enable **Re-pull image**.
3. Deploy the stack again.

By default Portainer does not check for new versions automatically. Automatic updates can be arranged through a Portainer webhook on the stack, or with something like Watchtower.

## Points to keep in mind

- Use a strong admin password.
- Check that `TOOLBOX_PORT` is free on the host.
- Do not remove the named volumes unless you deliberately want to wipe all Toolbox data.
- For production, prefer a fixed `IMAGE_TAG` over always using `latest`, so you know exactly which version is running.
