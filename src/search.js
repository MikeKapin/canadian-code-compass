/**
 * Search engine — scenario-based + keyword + section browse
 * Uses Fuse.js for fuzzy matching against both scenario index and clause data
 */

let scenarioFuse = null;
let b149_1_Fuse = null;
let b149_2_Fuse = null;
let scenarioIndex = [];
let b149_1_Clauses = [];
let b149_2_Clauses = [];
let bulletins = [];

// --- Data Loading ---

export async function loadAllData() {
  const [scenarios, clauses1, clauses2, bulls] = await Promise.all([
    fetchJSON('data/scenario-index.json'),
    fetchJSON('data/b149-1-clauses.json'),
    fetchJSON('data/b149-2-clauses.json'),
    fetchJSON('data/bulletins.json'),
  ]);

  scenarioIndex = scenarios || [];
  b149_1_Clauses = clauses1 || [];
  b149_2_Clauses = clauses2 || [];
  bulletins = bulls || [];

  // Build Fuse indexes
  scenarioFuse = new Fuse(scenarioIndex, {
    keys: [
      { name: 'violation_descriptions', weight: 0.5 },
      { name: 'trade_synonyms', weight: 0.25 },
      { name: 'plain_language_rule', weight: 0.15 },
      { name: 'primary_clause', weight: 0.1 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const clauseFuseOpts = {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'description', weight: 0.35 },
      { name: 'clause', weight: 0.25 },
    ],
    threshold: 0.35,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  };

  b149_1_Fuse = new Fuse(b149_1_Clauses, clauseFuseOpts);
  b149_2_Fuse = new Fuse(b149_2_Clauses, clauseFuseOpts);

  return { scenarioIndex, b149_1_Clauses, b149_2_Clauses, bulletins };
}

async function fetchJSON(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// --- Scenario Search ---

export function searchScenario(query, filter = 'all') {
  if (!query || query.length < 2 || !scenarioFuse) return [];

  const results = scenarioFuse.search(query, { limit: 20 });

  return results
    .map(r => {
      const item = r.item;
      const codeStd = item.code_standard.includes('B149.1') ? 'b149-1' : 'b149-2';
      if (filter !== 'all' && filter !== codeStd) return null;

      return {
        type: 'scenario',
        clause: item.primary_clause,
        relatedClauses: item.related_clauses || [],
        title: item.violation_descriptions[0],
        description: item.plain_language_rule,
        codeStandard: item.code_standard,
        citation: item.tssa_tag_citation,
        severity: item.severity,
        score: r.score,
        hasBulletin: clauseHasBulletin(item.primary_clause),
        allDescriptions: item.violation_descriptions,
        id: item.id,
      };
    })
    .filter(Boolean);
}

// --- Keyword Search ---

export function searchKeyword(query, filter = 'all') {
  if (!query || query.length < 2) return [];
  const results = [];

  if (filter === 'all' || filter === 'b149-1') {
    if (b149_1_Fuse) {
      const b1 = b149_1_Fuse.search(query, { limit: 30 });
      b1.forEach(r => {
        results.push({
          type: 'clause',
          clause: r.item.clause,
          title: r.item.title,
          description: r.item.description || '',
          section: r.item.section,
          codeStandard: 'B149.1-25',
          citation: `CSA B149.1-25 Clause ${r.item.clause}`,
          category: r.item.category || '',
          score: r.score,
          hasBulletin: clauseHasBulletin(r.item.clause),
        });
      });
    }
  }

  if (filter === 'all' || filter === 'b149-2') {
    if (b149_2_Fuse) {
      const b2 = b149_2_Fuse.search(query, { limit: 30 });
      b2.forEach(r => {
        results.push({
          type: 'clause',
          clause: r.item.clause,
          title: r.item.title,
          description: r.item.description || '',
          section: r.item.section,
          codeStandard: 'B149.2-25',
          citation: `CSA B149.2-25 Clause ${r.item.clause}`,
          category: r.item.category || '',
          score: r.score,
          hasBulletin: clauseHasBulletin(r.item.clause),
        });
      });
    }
  }

  // Sort by score (lower is better in Fuse.js)
  results.sort((a, b) => a.score - b.score);
  return results.slice(0, 40);
}

// --- Combined Search (scenario + keyword fallback) ---

export function search(query, mode = 'scenario', filter = 'all') {
  if (mode === 'scenario') {
    // Try scenario first, fall back to keyword if few results
    const scenarioResults = searchScenario(query, filter);
    if (scenarioResults.length >= 3) return scenarioResults;

    // Supplement with keyword results
    const keywordResults = searchKeyword(query, filter);
    const seen = new Set(scenarioResults.map(r => r.clause));
    const supplemented = [...scenarioResults];
    for (const r of keywordResults) {
      if (!seen.has(r.clause)) {
        supplemented.push(r);
        seen.add(r.clause);
      }
      if (supplemented.length >= 15) break;
    }
    return supplemented;
  }

  if (mode === 'keyword') {
    return searchKeyword(query, filter);
  }

  return [];
}

// --- Section Browser ---

export function getSectionTree(filter = 'all') {
  const tree = [];

  if (filter === 'all' || filter === 'b149-1') {
    const b1Sections = groupBySection(b149_1_Clauses, 'B149.1-25');
    tree.push({
      code: 'B149.1-25',
      title: 'Natural Gas Installation Code',
      sections: b1Sections,
    });
  }

  if (filter === 'all' || filter === 'b149-2') {
    const b2Sections = groupBySection(b149_2_Clauses, 'B149.2-25');
    tree.push({
      code: 'B149.2-25',
      title: 'Propane Storage and Handling Code',
      sections: b2Sections,
    });
  }

  return tree;
}

function groupBySection(clauses, codeStandard) {
  const map = new Map();
  for (const c of clauses) {
    const sec = c.section || 'Other';
    if (!map.has(sec)) {
      map.set(sec, { section: sec, sectionTitle: c.section_title || `Section ${sec}`, clauses: [] });
    }
    map.get(sec).clauses.push({ ...c, codeStandard });
  }
  // Sort sections numerically
  return [...map.values()].sort((a, b) => {
    const na = parseFloat(a.section) || 999;
    const nb = parseFloat(b.section) || 999;
    return na - nb;
  });
}

// --- Bulletin Helpers ---

function clauseHasBulletin(clause) {
  return bulletins.some(b =>
    b.related_clauses && b.related_clauses.some(rc => clause.startsWith(rc) || rc.startsWith(clause))
  );
}

export function getBulletins() {
  return bulletins;
}

export function getClauseCount() {
  return {
    b149_1: b149_1_Clauses.length,
    b149_2: b149_2_Clauses.length,
    scenarios: scenarioIndex.length,
    bulletins: bulletins.length,
  };
}