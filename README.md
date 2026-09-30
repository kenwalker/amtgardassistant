# AmtBot - A discord BOT

*AmtBot* Is a discord BOT for Amtgard rules, ORK information and any other helpful commands that can help with immersion while engaged online.

This code is likely **shite**! My first bot and I'm hacking as I learn. This is one of those, _"I'll clean it up later..."_ kind of projects.

See the [AmtBot Facebook](https://www.facebook.com/discordamtbot/) page for info.

## ORK API access

The ORK sits behind Cloudflare, which blocks API calls from hosted platforms unless
each request carries the private key issued to the application. AmtBot sends the
`X-Ork-Key`, `X-ORK-Client` and `User-Agent` headers on every ORK call.

`config.json` (git-ignored) needs:

```json
{
    "token": "<discord bot token>",
    "prefix": "!",
    "app": "ab",
    "ork_key": "<client key from the ORK administrators>",
    "ork_contact": "<optional contact URL or email for the ORK devs>"
}
```

The `ORK_API_KEY` environment variable overrides `ork_key` if set. Never commit the key.
