#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Local Database Seed Runner for DZENGAGE
 *
 * Runs `supabase/seed.sql` against the local Supabase PostgreSQL database.
 * Strictly verifies that the target database is a local instance before executing.
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const dbUrl = process.env.DATABASE_URL || DEFAULT_LOCAL_DB_URL;

// 1. Connection Safety Guardrail
function isLocalHost(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    // If not a full URL string, check substring
    return urlStr.includes('127.0.0.1') || urlStr.includes('localhost');
  }
}

if (!isLocalHost(dbUrl)) {
  console.error('\n❌ SAFETY GUARD TRIGGERED:');
  console.error(`   Attempted to run seed against non-local database host: ${dbUrl}`);
  console.error('   This seed script is strictly restricted to local development (127.0.0.1 / localhost).\n');
  process.exit(1);
}

async function runSeed() {
  console.log('\n🌱 DZENGAGE Local Database Seed Runner');
  console.log(`📡 Connecting to local database: ${dbUrl}...\n`);

  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();

    const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.sql not found at expected path: ${seedPath}`);
    }

    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('⚡ Executing supabase/seed.sql...');
    await client.query(seedSql);

    // Fetch and display seed stats
    const { rows: orgs } = await client.query(
      `SELECT id, name, slug FROM organizations ORDER BY created_at ASC`
    );

    const { rows: campaigns } = await client.query(
      `SELECT count(*) as count FROM campaigns`
    );

    const { rows: entries } = await client.query(
      `SELECT count(*) as count FROM entries`
    );

    const { rows: prizes } = await client.query(
      `SELECT count(*) as count FROM prizes`
    );

    const { rows: templates } = await client.query(
      `SELECT count(*) as count FROM prize_templates`
    );

    const { rows: items } = await client.query(
      `SELECT count(*) as count FROM prize_template_items`
    );

    console.log('\n================================================================');
    console.log('🎉 LOCAL DATABASE SEEDED SUCCESSFULLY!');
    console.log('================================================================');
    console.log(`🏢 Organizations Seeded: ${orgs.length}`);
    orgs.forEach((o) => console.log(`   • ${o.name} (Slug: ${o.slug})`));
    console.log(`🎯 Campaigns Populated : ${campaigns[0].count} (All mapped to unified franchise names)`);
    console.log(`🎁 Reward Templates    : ${templates[0].count} (Vouchers & Physical rewards)`);
    console.log(`🎟️  Voucher Code Items  : ${items[0].count} (Pre-loaded in stock room)`);
    console.log(`🏆 Campaign Prizes     : ${prizes[0].count} (Active allocations & inventory quotas)`);
    console.log(`👥 Participant Entries : ${entries[0].count} (Algerian Carriers 05/06/07 across 14 days)`);
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ Seed execution failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
