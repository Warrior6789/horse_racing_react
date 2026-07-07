import { Client } from 'pg'

const connectionString = process.env.E2E_DATABASE_URL
if (!connectionString) {
  console.error('E2E_DATABASE_URL environment variable is required')
  process.exit(1)
}

const RACE_ID = '14ea7401-47d2-4304-a197-3fa6baf14008'
const OWNER_ID = '192cae85-dfb2-483d-aa88-bc093437eea4'
const JOCKEY_ID = '26bc55e2-9ecb-4793-9671-b8385cbabdc8'
const HORSE_ID = 'd0b1c4f3-8456-41e3-9d1e-caddb71d4c3a'

async function main() {
  const client = new Client({ connectionString })
  await client.connect()

  const regs = await client.query(`SELECT "RegistrationID", "HorseID" FROM "Registrations" WHERE "RaceID" = $1`, [RACE_ID])
  const regIds = regs.rows.map(r => r.RegistrationID)
  const horseIds = regs.rows.map(r => r.HorseID)

  await client.query(`DELETE FROM "Prizes" WHERE "RegistrationID" = ANY($1::uuid[])`, [regIds])
  await client.query(`DELETE FROM "RaceResults" WHERE "RegistrationID" = ANY($1::uuid[])`, [regIds])
  await client.query(`DELETE FROM "Registrations" WHERE "RaceID" = $1`, [RACE_ID])

  await client.query(`UPDATE "Horses" SET "Status" = 'Healthy' WHERE "ID" = ANY($1::uuid[]) OR "ID" = $2`, [horseIds, HORSE_ID])

  const posConfigRes = await client.query(`SELECT 1 FROM "PositionPrizeConfigs" WHERE "Status" = 'Active' LIMIT 1`)
  if (posConfigRes.rows.length === 0) {
    await client.query(
      `INSERT INTO "PositionPrizeConfigs" ("PositionPrizeConfigId", "Pos1Ratio", "Pos2Ratio", "Pos3Ratio", "Pos4Ratio", "Pos5Ratio", "Pos6Ratio", "Status", "CreatedAt") VALUES (gen_random_uuid(), 0.5, 0.3, 0.2, 0, 0, 0, 'Active', NOW())`
    )
  }

  const jockeyConfigRes = await client.query(`SELECT 1 FROM "JockeyRewardConfigs" WHERE "Status" = 'Active' LIMIT 1`)
  if (jockeyConfigRes.rows.length === 0) {
    await client.query(
      `INSERT INTO "JockeyRewardConfigs" ("JockeyRewardConfigId", "WinCut", "PlaceCut", "Status", "CreatedAt") VALUES (gen_random_uuid(), 0.2, 0.1, 'Active', NOW())`
    )
  }

  const refereeRes = await client.query(
    `SELECT "ID" FROM "Account" WHERE "Role" = 'Referee' AND "Status" = 'Active' AND "IsDeleted" = false LIMIT 1`
  )
  if (refereeRes.rows.length === 0) {
    console.error('No active Referee account found. Create one before running e2e tests.')
    process.exit(1)
  }
  const refereeId = refereeRes.rows[0].ID

  await client.query(
    `UPDATE "Races" SET "Status" = 'Scheduled', "EndTime" = NULL, "PrizePool" = 3000000, "StartTime" = NOW() + interval '7 days', "RefereeID" = $2 WHERE "RaceID" = $1`,
    [RACE_ID, refereeId]
  )

  const raceFeeRes = await client.query(`SELECT "RegistrationFee" FROM "Races" WHERE "RaceID" = $1`, [RACE_ID])
  const ownerStartingBalance = Number(raceFeeRes.rows[0].RegistrationFee) + 1000000

  let ownerProfileCount = await client.query(`SELECT COUNT(*) FROM "UserProfiles" WHERE "AccountID" = $1`, [OWNER_ID])
  if (Number(ownerProfileCount.rows[0].count) === 0) {
    await client.query(
      `INSERT INTO "UserProfiles" ("ProfileID", "AccountID", "FullName", "Balance", "IsDeleted", "CreateAt") VALUES (gen_random_uuid(), $1, 'E2E Owner', $2, false, NOW())`,
      [OWNER_ID, ownerStartingBalance]
    )
  } else {
    await client.query(`UPDATE "UserProfiles" SET "Balance" = $2 WHERE "AccountID" = $1`, [OWNER_ID, ownerStartingBalance])
  }

  await client.query(`UPDATE "JockeyProfile" SET "Balance" = 0 WHERE "AccountID" = $1`, [JOCKEY_ID])

  const extraHorses = await client.query(
    `SELECT "ID" FROM "Horses" WHERE "Status" = 'Healthy' AND "ID" != $1 LIMIT 2`,
    [HORSE_ID]
  )
  if (extraHorses.rows.length < 2) {
    console.error(`Need 2 other Healthy horses to fill the race, found ${extraHorses.rows.length}.`)
    process.exit(1)
  }

  const usedJockeys = new Set([JOCKEY_ID])
  let gateNumber = 5
  for (const h of extraHorses.rows) {
    const jRes = await client.query(
      `SELECT "ID" FROM "Account" WHERE "Role" = 'Jockey' AND "ID" != ALL($1::uuid[]) LIMIT 1`,
      [[...usedJockeys]]
    )
    if (jRes.rows.length === 0) {
      console.error('No spare Jockey account found to fill the race.')
      process.exit(1)
    }
    const jockeyId = jRes.rows[0].ID
    usedJockeys.add(jockeyId)
    await client.query(
      `INSERT INTO "Registrations" ("RegistrationID", "RaceID", "HorseID", "JockeyID", "GateNumber", "Status", "OwnerConfirmation", "JockeyConfirmation", "CreateAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Confirmed', true, true, NOW())`,
      [RACE_ID, h.ID, jockeyId, gateNumber]
    )
    gateNumber += 1
  }

  console.log('E2E test data reset complete.')
  await client.end()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
