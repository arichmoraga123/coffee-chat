-- One-time: make seeded / legacy deals visible to members (GET /api/deals).
UPDATE "Deal" SET status = 'published' WHERE status IS NULL OR status = 'draft';
