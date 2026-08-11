# Monthly subscriber reports

`scripts/subscriber-report.js` pulls the Buttondown list and writes a dated report here on
the 1st of each month, plus one row in `history.csv`.

It reports **segments, not just a total**. That is the whole point: a sponsor buys a
described audience. "1,400 dermatologists, 62% attending physicians" is a rate card;
"some subscribers" is not. Each report breaks the list down by role, by specialty, and by
the page people signed up on.

## One-time setup: the API key

The key is a password. It is deliberately **not** stored in this repo, and Claude will not
create or handle it — create it yourself:

1. Go to https://buttondown.com/settings/programming
2. Copy your **API key**
3. Save it so only you can read it — paste the key, then press **Ctrl-D**:

```bash
mkdir -p ~/.config/convene && chmod 700 ~/.config/convene && (umask 177; cat > ~/.config/convene/buttondown-token)
```

4. Check it worked (prints a length, not the key):

```bash
cat ~/.config/convene/buttondown-token | wc -c
```

5. Run the first report:

```bash
cd "/Users/ckeithw/projects/convene-md" && node scripts/subscriber-report.js
```

If Buttondown has renamed a field and a breakdown comes back empty, dump one raw record to
see the current shape:

```bash
node scripts/subscriber-report.js --raw
```

## Schedule

1st of each month at 08:40, via `~/Library/LaunchAgents/com.medconf.subscribers.plist`.
It runs after the weekly traffic job so the two never contend for the same git checkout.

```bash
launchctl list | grep medconf
tail -40 logs/subscribers.log
```

## Reading a report

- **Total vs confirmed.** If double opt-in is on, unconfirmed subscribers never receive
  anything. A large unconfirmed share usually means the confirmation email is not landing.
- **Subscribers with no role or specialty** signed up before those fields existed
  (10 Aug 2026). Exclude them when quoting segment counts to anyone.
- **The source column decides where to spend effort.** A page that converts is worth more
  internal links than one that merely gets traffic.
- Growth is measured against the previous row in `history.csv`, so the series stays
  meaningful even if a report is missed.
