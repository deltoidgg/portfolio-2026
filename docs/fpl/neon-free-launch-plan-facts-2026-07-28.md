# Neon Free and Launch plan facts

- **Checked:** 28 July 2026
- **Scope:** current Neon-hosted Postgres plan limits, metering, and published unit prices only
- **Source policy:** first-party Neon pricing and documentation pages. The live [pricing page](https://neon.com/pricing) and [Plans documentation](https://neon.com/docs/introduction/plans) take precedence over older Neon blog posts and changelog entries whose numbers have since changed.

This note intentionally does not assess this repository's workload or recommend a migration or retention policy.

## Current limits and rates

| Item                    | Free                                                                  | Launch                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base price              | **$0/month**; permanent, not a trial                                  | **No monthly minimum**; pay only for metered usage. Neon says invoices below **$0.50** are not collected.                                                             |
| Projects                | **100**                                                               | **100**                                                                                                                                                               |
| Branches                | **10/project**; no extra branches available                           | **10/project included**. Extra branches are **$1.50/branch-month**, prorated hourly (about **$0.002/hour**), up to a technical maximum of **5,000 branches/project**. |
| Compute                 | **100 CU-hours/project/month**                                        | **$0.106/CU-hour** from the first CU-hour; no included Launch compute block is listed.                                                                                |
| Compute size            | Autoscaling up to **2 CU / 8 GB RAM**                                 | Autoscaling up to **16 CU / 64 GB RAM**                                                                                                                               |
| Scale to zero           | Mandatory after 5 minutes idle                                        | After 5 minutes idle by default; can be disabled                                                                                                                      |
| Database storage        | **0.5 GB/project**, a continuous cap rather than a monthly allowance  | **$0.35/GB-month**. There is no paid-plan storage quota, but the published technical limit is **16 TB logical data per branch** unless Neon raises it.                |
| Instant-restore history | No charge; default/maximum **6 hours**, capped at **1 GB** of history | **$0.20/GB-month** of retained root-branch changes; **1 day default**, up to **7 days**, or zero to disable instant restore and Time Travel                           |
| Snapshots               | 1 manual snapshot; snapshot bytes are billed at **$0.09/GB-month**    | 100 manual snapshots; scheduled snapshots available; snapshot bytes are billed at **$0.09/GB-month**                                                                  |
| Public network transfer | **5 GB/month included**                                               | **500 GB/project/month included**, then **$0.10/GB**                                                                                                                  |

Sources: [Neon pricing](https://neon.com/pricing), [Neon plans](https://neon.com/docs/introduction/plans), [History window](https://neon.com/docs/introduction/history-window), and [Network transfer costs](https://neon.com/docs/introduction/network-transfer).

### Compute accounting

A CU-hour is compute size multiplied by active runtime. For example, a 0.25 CU compute running for four hours consumes one CU-hour. Suspended computes accrue no CU-hours. Every compute in a project counts, including read replicas and computes on other branches. Free CU-hours reset each monthly billing period. ([Plans](https://neon.com/docs/introduction/plans))

### Branch accounting

The included branch count includes the root branch. On Launch, the metering API counts child-branch hours; billing subtracts the nine included child branches from the total before charging. A branch-month is normalized to 744 hours, so the exact published rate is $1.50 per extra branch-month and the displayed hourly rate is an approximation. ([Usage and cost calculations](https://neon.com/docs/introduction/usage-calculations))

## How Neon bills storage

Neon separates storage into several metrics:

1. **Root-branch database storage:** the branch's actual logical data size.
2. **Child-branch database storage:** the lower of (a) accumulated changes since the child was created and (b) the child's logical data size. A new child initially adds no database storage because of copy-on-write.
3. **Instant-restore history:** retained root-branch WAL/change history, billed separately at $0.20/GB-month on Launch.
4. **Snapshot storage:** billed separately at $0.09/GB-month.

The $0.35 database-storage rate applies to the sum of root- and child-branch database storage. Instant-restore and snapshot bytes are not included in that $0.35 line item. ([Plans](https://neon.com/docs/introduction/plans))

Storage is metered hourly as byte-hours and converted to GB-months with:

```text
GB-months = byte-hours / 744 / 1,000,000,000
```

Neon uses decimal GB and a fixed 744-hour billing month. Thus storage removed partway through a month stops adding its bytes to future hourly samples, but it does not erase byte-hours already accrued earlier in that billing period. ([Usage and cost calculations](https://neon.com/docs/introduction/usage-calculations))

On Free, the 0.5 GB cap is based on branch `logical_size` values summed across the project; it is not 0.5 GB for every branch. ([Usage and cost calculations — Branch storage](https://neon.com/docs/introduction/usage-calculations#branch-storage))

## What happens at Free-plan limits

The detailed Plans documentation distinguishes the limits as follows:

- **Compute or public network transfer exhausted:** the compute is suspended until the next billing period or until the organization upgrades.
- **0.5 GB storage reached:** operations that would increase storage—including inserts, updates, and deletes—fail until storage is reduced or the organization upgrades.
- **10 branches reached:** creation of another branch fails.
- **Data retention:** exceeding a limit does **not** delete stored data.
- **Reset behavior:** CU-hours and network transfer reset each monthly billing period; project, branch, and storage caps are continuous limits.

Source: [Plans FAQ: “What happens if I exceed my Free plan limits?”](https://neon.com/docs/introduction/plans#faqs) and [Cost optimization: storage limit](https://neon.com/docs/introduction/cost-optimization#storage-faqs).

There is a wording conflict in Neon's current first-party material: the shorter FAQ on the live [pricing page](https://neon.com/pricing) says hitting “any Free monthly limit,” including storage, suspends compute until the next month. The more detailed Plans and Cost Optimization docs instead call storage a continuous cap and say storage-increasing operations fail until space is reduced or the plan is upgraded. The detailed documentation is also consistent with its statement that data is not deleted and with the separate monthly-reset description, so it is the stronger source for storage-limit behavior.

## Does deleting data immediately reduce size or cost?

**Not reliably or instantly.** There are three distinct effects:

1. **Database data size:** Neon says deleting old rows reduces the root-branch data billed going forward, but PostgreSQL row deletion leaves dead tuples. A normal `VACUUM` marks that space reusable and does not shrink the `Data size` shown in the Console. `VACUUM FULL` rewrites and shrinks the table, but it locks the table and temporarily needs space for another copy; Neon warns that this temporary spike can fail at the Free 0.5 GB cap. ([Cost optimization: VACUUM FAQ](https://neon.com/docs/introduction/cost-optimization#how-does-running-vacuum-or-vacuum-full-affect-my-storage-costs))
2. **Restore-history size:** every data modification, including `DELETE`, creates WAL. Those records temporarily add to History until they age out of the configured history window. For mass removal, Neon says `TRUNCATE TABLE` produces far less WAL than row-by-row `DELETE`. Reducing the history window causes out-of-window WAL to be removed and stop contributing to storage cost; setting it to zero disables instant restore and Time Travel. ([Cost optimization: delete operations](https://neon.com/docs/introduction/cost-optimization#do-delete-operations-add-to-storage), [History window](https://neon.com/docs/introduction/history-window))
3. **Billing and dashboard timing:** database storage is hourly metered, so a real size reduction affects future byte-hours rather than reversing past usage. Console usage can lag by about an hour and is not refreshed for an inactive project, so the displayed number need not fall immediately. ([Usage and cost calculations](https://neon.com/docs/introduction/usage-calculations), [Monitor billing and usage](https://neon.com/docs/introduction/monitor-usage))

Deleting an unused child branch also ends its future storage contribution and, if it was above the included branch allowance, its future extra-branch lifetime. It cannot reverse storage byte-hours or branch-hours already accumulated. This follows directly from Neon's hourly storage and branch metering definitions. ([Plans](https://neon.com/docs/introduction/plans), [Usage and cost calculations](https://neon.com/docs/introduction/usage-calculations))

## Source list

- [Neon Pricing Plans](https://neon.com/pricing)
- [Neon plans](https://neon.com/docs/introduction/plans)
- [Usage and cost calculations](https://neon.com/docs/introduction/usage-calculations)
- [Cost optimization](https://neon.com/docs/introduction/cost-optimization)
- [History window](https://neon.com/docs/introduction/history-window)
- [Network transfer costs](https://neon.com/docs/introduction/network-transfer)
- [Monitor billing and usage](https://neon.com/docs/introduction/monitor-usage)
