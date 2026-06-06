import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key']);

  const db = new Databases(client);
  const dbId = process.env.APPWRITE_DB_ID ?? 'phaze20';
  const maxAgeMinutes = parseInt(process.env.REACTION_MAX_AGE_MINUTES ?? '60', 10);

  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();

  let deleted = 0;
  let cursor = undefined;

  do {
    const queries = [
      Query.lessThan('createdAt', cutoff),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const page = await db.listDocuments(dbId, 'reactions', queries);
    if (!page.documents.length) break;

    await Promise.all(page.documents.map((doc) =>
      db.deleteDocument(dbId, 'reactions', doc.$id).catch(() => {})
    ));

    deleted += page.documents.length;
    cursor = page.documents.length === 100 ? page.documents.at(-1).$id : undefined;
  } while (cursor);

  log(`Deleted ${deleted} stale reactions older than ${maxAgeMinutes}min`);
  return res.json({ deleted });
};
