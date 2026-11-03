# CorpConnect Pune: launch playbook

Position CorpConnect as a **high-trust, hyper-local corporate utility**, not a social app. Every message comes back to one proof point: *everyone here verified their work email at a Pune tech company.*

The tracked links and QR codes for every placement are in **Admin → QR codes & campaign links** (`/admin/marketing`). Results show up under **Admin → Sign-ups by channel**.

---

## 0. Launch gate (do this first)

Don't spend on public ads until the **Launch readiness** meter on `/admin` is green:

| Target | Why |
|---|---|
| **40+ active listings** (aim for both Hinjawadi and Kharadi) | Visitors from a "sell your laptop" ad need to see real items. |
| **20+ open jobs** across Hinjawadi + Kharadi/Magarpatta | The referral angle needs real openings. |
| **100 verified members** | Enough buyers and referrers that new posts get replies. |

**Seed only genuine supply.** Never post placeholder or made-up listings or jobs. Fake supply misleads users, and once someone notices, it destroys the trust the whole product depends on. Real sources:

- **Your own items**, plus items from friends and colleagues who are actually selling.
- **Ambassadors (section 3):** ask each one to list 2–3 real items and post their team's real openings.
- **Hiring managers and engineers you know:** ask them to post openings their team has *right now*.

**Feature the best listings** (good photos, fair price) with the **Feature this listing** button on the listing page. Featured listings sort to the top.

---

## 1. On-ground: Pune tech belts

### Canteen and food-court standees / screens

*Hinjawadi Ph 1–3 · EON Kharadi · Magarpatta Cybercity · Commerzone Yerwada*

- **Print:** `/admin/marketing` → pick the food court → **Standee (A5)** or **Print flyers (4×A6)** → **Print / Save as PDF**. Each placement has its own QR code, so you can see which food court converts.
- **Permission first:** food courts, digital screens and gates in Rajiv Gandhi Infotech Park, EON, Magarpatta and Commerzone are run by park management or the F&B operator. Get written permission, or book through their media vendor, before placing anything. Unauthorised flyering can get you banned from a park.
- **Screen copy (16:9, readable in 3 seconds):**

  > **Selling your phone or laptop?**
  > Meet verified tech peers at your campus gate. No scam callers, no random strangers.
  > *Scan → corpconnect.it.com/sell*

### Gate flyer drops

- Hinjawadi and Kharadi gates, **12:45–2:00 pm** and **6:00–7:30 pm**.
- Use the `gate-hjw` / `gate-kharadi` QR flyers.
- One line to say while handing a flyer over: *"Pune-only marketplace and referrals, only for verified employees. Scan, it takes a minute."*

### Commute

*Viman Nagar / Kalyani Nagar metro · PCMC line · cab and shuttle screens*

Use the `metro-viman`, `metro-pcmc` and `cab-screens` links. Keep the copy short, because people only glance at it:

> **Pune's private network for verified techies.**
> Buy & sell gear safely · Internal referrals · Local tech communities
> *corpconnect.it.com*

---

## 2. Digital and community distribution

### Reddit: transparent founder posts

**Rules first:**
- Read each subreddit's sidebar rules before posting. Many only allow self-promotion in specific threads, or with a specific flair.
- Post from **your own account**, say clearly that you built it, and reply to comments yourself.
- **No alt accounts or paid upvotes.** Reddit bans for this, and it backfires publicly.

**r/pune** (link: `reddit-pune`)

> **I built a Pune-only marketplace + referral board for tech employees, verified by work email**
>
> Hi r/pune, I'm Pavan. I work in Pune tech. I kept seeing colleagues get scam calls and "advance payment" tricks when selling phones and laptops online, and referral requests getting lost in LinkedIn inboxes. So I built **CorpConnect**: you sign up with your **company email** (TCS, Infosys, Wipro, Cognizant, NICE, Persistent… 46 companies so far). You get a 6-digit code in your work inbox, and that's the only check. No ID cards, no documents.
>
> What you can do:
> - Buy/sell electronics with other verified employees, and hand over at a known spot (Hinjawadi Ph 1 Circle, EON Gate 1, Magarpatta Tower 7…)
> - Request internal referrals from people who actually work at the company, and see the status
> - Join local communities (Hinjawadi Developers, Kharadi & Magarpatta Infra Hub, Pune Tech Circle)
>
> It's free, Pune-only for now. Your work email is never shown to other members. Honest feedback very welcome, especially on what would make you trust it.
>
> corpconnect.it.com

**r/developersIndia** (link: `reddit-devindia`). Lead with how it's built and how it handles privacy; this audience is skeptical:

> **Built a work-email-verified referral board for Pune: here's how verification and privacy work**
>
> Side project: CorpConnect, a referral board and marketplace for Pune tech employees.
> - **Verification:** server-generated 6-digit OTP to your corporate inbox, stored hashed, rate-limited. Personal email providers are blocked, and unknown domains need manual approval.
> - **Privacy:** Postgres row-level security. Referral requests are visible only to you and the referrer. Chats only to the two people in them. Corporate emails aren't exposed to other users.
> - **Referrals** have a tracked status: requested → in review → referred / declined.
>
> Looking for feedback from people who've given or asked for referrals: what would make this better than a cold LinkedIn message?

### LinkedIn ads

- **Targeting:** Location = Pune. Company = Infosys, TCS, Cognizant, Wipro, Barclays, Tech Mahindra, Perforce, NICE, Jio and the rest of the seeded list. Optionally add job function Engineering / IT and seniority Entry–Senior.
- **Destination links:** `linkedin-referrals` → `/referrals`; `linkedin-marketplace` → `/sell`.
- **Single-image ads.** Keep the headline under 70 characters and the intro text under 150, so neither gets cut off.

| Angle | Headline | Intro text |
|---|---|---|
| Referrals | Get referred by a verified insider in Pune | Skip the job-portal black hole. Request internal referrals directly from verified employees at Pune's top MNC and product companies. |
| Referrals | Hinjawadi & Kharadi referrals, tracked | Ask a real employee for a referral and see its status: requested, in review, referred. Free, work-email verified. |
| Marketplace | Sell your laptop to verified colleagues | No scam calls, no strangers. Sell to work-email-verified tech employees and hand over at your campus gate. |
| Community | Pune's network for verified techies | Developers, DevOps and IT professionals across Hinjawadi, Kharadi and Magarpatta. Verified by work email. |

### Blind / Grapevine / WhatsApp

- Post as yourself and **say you built it**, e.g. *"Disclosure: I made this."* Use the `word-of-mouth` link.
- Don't write fake "a friend told me about this" posts, or ask others to post without saying they're connected to you. It's astroturfing. These communities catch it quickly, and it would undercut the trust angle.

---

## 3. Ambassadors and referral loops

### Recruit 1–2 ambassadors per campus

Start with TCS Sahyadri Park, Infosys Phase 2, Wipro Hinjawadi and EON Kharadi.

- **What they get:**
  - an **Ambassador** badge, which an admin sets in **Admin → Members → Make ambassador**
  - their best listings **featured**
  - an **Early member** badge (automatic for members #1–500)
- **What they do:**
  - list 2–3 real items
  - post real openings from their team
  - share their **personal invite link** (Profile → Invite colleagues). It's tracked as `invite`, and you can see who joined through whom.
- **Internal Slack/Teams:** ask ambassadors to check their company's policy first. Many companies only allow buy/sell posts in specific channels (e.g. `#buy-and-sell`, `#marketplace`) and forbid promotion in `#general`. Posting against policy can get *them* in trouble. Ambassadors should also say they're a CorpConnect ambassador when they share it.

**Outreach DM:**

> Hey {name}, I'm launching CorpConnect, a Pune-only marketplace and referral board where everyone is verified by work email. Would you be one of our first ambassadors at {campus}? You'd get an Ambassador badge and featured listings, and I'd love your feedback. All I'd ask is that you list a couple of things you're actually selling and share your invite link where your company allows it. Interested?

**Team-chat message (only where allowed):**

> Selling or buying a phone/laptop/monitor? I've started using CorpConnect. Only verified employees from Pune tech companies can join, and you hand over at a campus gate. You can also request referrals there. Disclosure: I'm a CorpConnect ambassador. {invite link}

---

## 4. Ad angles: approved copy

| Pillar | Pain point | Headline |
|---|---|---|
| Marketplace | Scam callers, advance-payment fraud, unsafe roadside hand-offs | **Stop dealing with marketplace scammers. Sell your tech to verified tech peers at your office gate.** |
| Referrals | Ghosted InMails, résumé black holes | **Skip the blind job portal. Request internal referrals from verified engineers in Hinjawadi & Kharadi.** |
| Community | Noisy, spammy WhatsApp groups | **Pune's dedicated network for corporate developers, DevOps and IT professionals.** |

### Claims checklist (keep ads accurate)

- **Don't name competitors** (e.g. "No OLX scams") in paid or printed ads. Comparative or disparaging claims about a named brand can break ASCI guidelines and invite legal complaints. "No marketplace scams" makes the same point safely.
- **"Verified" means work email only.** Say "verified by work email", never "background-checked", "safe", "guaranteed" or "scam-free". Scams by a verified user are still possible, so keep the safety tips on listing pages.
- **Product names** like "iPhone" and "ThinkPad" are fine to describe what people sell on organic posts and flyers. In paid ads, generic terms ("phone or laptop") avoid trademark-policy rejections.
- **Get the Privacy Policy and Terms reviewed** (DPDP Act 2023) before paid campaigns. The current pages are drafts.

---

## 5. Measure weekly

- **Admin → Sign-ups by channel:** verified sign-ups per placement. Drop placements with no verified sign-ups after two weeks.
- **Admin → Launch readiness:** listings, jobs and members against targets.
- **Invite links:** check how many members joined as `invite`, and thank your top inviters.
