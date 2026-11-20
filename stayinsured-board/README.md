# Stay Insured Navigator Board

A one-page board showing which health insurance navigators have room, when their next
opening is, and where they are today. Selecting a navigator opens their contact details,
upcoming openings, and locations and hours.

Everything runs on free Google tools:

| Piece | What it is | Who touches it |
|---|---|---|
| **Google Sheet** | All navigator info, schedules, and status | Navigators (status, note, out today) and the HSC admin (everything else) |
| **Script inside the Sheet** (`apps-script/Code.gs`) | Checks connected calendars every 15 minutes and serves the board | Set up once |
| **Board page** (`index.html`, also copied as `apps-script/Page.html`) | The page residents and partners see | Nobody, after setup |

Until the page is connected to a Sheet, it shows the real navigators and schedules with
**sample** openings, clearly labeled.

---

## One-time setup (about 20 minutes)

### 1. Create the Sheet and add the script
1. Create a new Google Sheet named **Stay Insured Navigator Board**. Use an HSC Google account so it doesn't depend on one person.
2. Open **Extensions → Apps Script**.
3. Replace the contents of `Code.gs` with this repo's `apps-script/Code.gs`.
4. Click **+ → HTML**, name it `Page` (exactly), and paste in `apps-script/Page.html`.
5. Open **Project Settings** (gear icon), check **Show "appsscript.json"**, and replace that file's contents with `apps-script/appsscript.json`.
6. Save, then reload the Sheet. A **Navigator Board** menu appears.

### 2. Fill in the Sheet
1. Choose **Navigator Board → Set up this spreadsheet**. Google asks you to approve access the first time.
2. The Sheet now has these tabs, already filled in from hsctc.org/stayinsured:
   - **Navigators**: one row per navigator. The three **yellow-headed columns** (Status, Note, Out today) are the ones navigators update. Hover over any heading for an explanation.
   - **Schedule**: one row per recurring location and time.
   - **Closures**: holidays when everyone is closed. Leave Navigator ID blank to close everyone, or fill it in to close just one navigator.
   - **Settings**: when the light turns green, when a quiet calendar shows "Call to confirm", and the help line.
   - **Openings**: written by the script. Don't edit it.
3. Check these, which the public page didn't make clear:
   - Which weeks Lindsay Scrivens is at CARS and Rodeway Inn (set **First date** to any date she's there).
   - Her CARS times, and Seven Valleys' hours.

### 3. Publish the board
1. In Apps Script, click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
2. Copy the **Web app URL**. That's the board's address.
3. Choose **Navigator Board → Turn on automatic sync (every 15 minutes)**.

### 4. Put it on hsctc.org/stayinsured
Add a **Custom HTML** block to the Stay Insured page with:

```html
<iframe src="PASTE-WEB-APP-URL-HERE" style="width:100%;height:1100px;border:0" title="Navigator availability"></iframe>
```

To host the page somewhere else (for example Netlify), paste the web app URL into the
`DATA_URL` line near the top of the script section in `index.html`.

---

## Connecting each navigator's calendar

Set **Feed type** on the Navigators tab, then fill in **Feed details**. Feed details are
private and never appear on the board.

| Feed type | Feed details | Notes |
|---|---|---|
| **SimplyBook.me** (HSC) | `Main HSC Office = 3:1` (service ID : provider ID). Separate several with `;` | First run **Navigator Board → Connect SimplyBook.me** with the company login and API key. In SimplyBook.me, turn on **Custom Features → API** to get a key. Then use **List SimplyBook.me services and providers** to see the IDs. |
| **Cal.com** | `username/event-name`, or one per site: `Catholic Charities = christy/catholic-charities; Free Clinic = christy/free-clinic` | Free. Make one Cal.com event type per outreach site so openings carry the location. |
| **Calendar feed (ICS)** | The calendar's secret address (Google: *Settings → Integrate calendar → Secret address in iCal format*; Outlook: *Publish calendar → ICS link*) | Openings = the hours on the Schedule tab, minus busy events, split into **Slot minutes** blocks. Daily and weekly repeating events are understood. Monthly repeats count only once. |
| **Booking form link** | none | Shows the booking link. Openings aren't listed. |
| **Manual** | none | The navigator keeps Status current by hand. |

After changing feeds, choose **Navigator Board → Sync calendars now**. The **Sync message**
column says `OK: 12 openings…` or explains the problem.

## For navigators: updating your status
Open the Sheet, find your row on **Navigators**, and change any of:
- **Status**: Automatic, Accepting, Limited openings, Full / waitlist, or Away.
- **Note**: a short public message. Clear it when it no longer applies.
- **Out today**: pick today's date to hide today's sessions.

The board updates within about two minutes. **Last updated** fills in by itself.

Give navigators **Editor** access to the Sheet. Ask them to change only their own row's
yellow columns. Editing a script-filled column shows a warning first.

## How the status light is decided
- A status set by hand always wins.
- **Automatic** with a connected calendar: at least `open_threshold` openings (default 6) in the next 7 days → **Accepting**; 1 or more → **Limited openings**; none → **Full / waitlist**.
- **Automatic** with no connected calendar → **Accepting**.
- If `stale_after_days` is set and a calendar hasn't synced, or a manual card hasn't been updated (after its first update), for that many days → **Call to confirm**.
