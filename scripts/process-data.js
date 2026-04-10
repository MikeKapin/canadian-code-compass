/**
 * Process raw CSA knowledge base JSON files into app-ready data files.
 * Run: node scripts/process-data.js
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = 'C:\\LocalProjects\\mcp-servers\\dev-tools';
const OUT_DIR = path.join(__dirname, '..', 'data');

// --- B149.1 Processing ---
function processB149_1() {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'csa_clauses_knowledge_base.json'), 'utf-8'));
  const clauseIndex = raw.clause_index;
  const sectionIndex = raw.section_index || {};

  const clauses = [];
  for (const [clauseNum, data] of Object.entries(clauseIndex)) {
    const section = getSection(clauseNum);
    clauses.push({
      clause: clauseNum,
      title: data.title || '',
      section: section,
      description: data.description || '',
      category: data.category || '',
      annex: isAnnex(clauseNum) ? clauseNum.charAt(0) : null,
    });
  }

  // Sort: sections numerically, then annexes alphabetically
  clauses.sort((a, b) => {
    const sa = sectionSortKey(a.clause);
    const sb = sectionSortKey(b.clause);
    if (sa !== sb) return sa - sb;
    return clauseSortKey(a.clause) - clauseSortKey(b.clause);
  });

  fs.writeFileSync(path.join(OUT_DIR, 'b149-1-clauses.json'), JSON.stringify(clauses, null, 0));
  console.log(`B149.1: ${clauses.length} clauses written`);
}

function getSection(clause) {
  if (/^[A-Z]/.test(clause)) return clause.charAt(0);
  const parts = clause.split('.');
  return parts[0];
}

function isAnnex(clause) {
  return /^[A-Z]/.test(clause);
}

function sectionSortKey(clause) {
  if (/^[A-Z]/.test(clause)) return 100 + clause.charCodeAt(0);
  return parseInt(clause.split('.')[0]) || 999;
}

function clauseSortKey(clause) {
  // Convert "4.13.2" to numeric for sorting
  const parts = clause.replace(/^[A-Z]\.?/, '').split('.');
  let key = 0;
  for (let i = 0; i < parts.length; i++) {
    const n = parseInt(parts[i]) || 0;
    key += n / Math.pow(1000, i);
  }
  return key;
}

// --- B149.2 Processing ---
function processB149_2() {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'csa_b149_2_knowledge_base.json'), 'utf-8'));
  const propaneCode = raw.propane_code || raw.document;
  const clauses = [];

  // Process sections
  if (propaneCode.sections) {
    for (const [secKey, secData] of Object.entries(propaneCode.sections)) {
      const secNum = secKey.replace('section_', '');
      const secTitle = secData.title || '';

      if (secData.clauses) {
        for (const [clauseKey, clauseData] of Object.entries(secData.clauses)) {
          // Handle numbered clauses (e.g., "4_1" -> "4.1") and named clauses
          const clauseNum = formatClauseNumber(clauseKey, secNum);
          clauses.push({
            clause: clauseNum,
            title: clauseData.title || '',
            section: secNum,
            section_title: secTitle,
            description: clauseData.description || '',
            type: 'clause',
          });

          // Process subclauses
          if (clauseData.subclauses) {
            for (const [subKey, subData] of Object.entries(clauseData.subclauses)) {
              const subNum = formatClauseNumber(subKey, secNum);
              clauses.push({
                clause: subNum,
                title: subData.title || '',
                section: secNum,
                section_title: secTitle,
                description: subData.description || '',
                type: 'subclause',
              });
            }
          }
        }
      }
    }
  }

  // Process annexes
  if (propaneCode.annexes) {
    for (const [annexKey, annexData] of Object.entries(propaneCode.annexes)) {
      const annexLetter = annexKey.replace('annex_', '').toUpperCase();
      if (annexData.clauses) {
        for (const [clauseKey, clauseData] of Object.entries(annexData.clauses)) {
          const clauseNum = formatClauseNumber(clauseKey, annexLetter);
          clauses.push({
            clause: clauseNum,
            title: clauseData.title || '',
            section: annexLetter,
            section_title: `Annex ${annexLetter}`,
            description: clauseData.description || '',
            type: 'annex',
          });
        }
      }
    }
  }

  // Sort
  clauses.sort((a, b) => {
    const sa = sectionSortKey(a.section);
    const sb = sectionSortKey(b.section);
    if (sa !== sb) return sa - sb;
    return clauseSortKey(a.clause) - clauseSortKey(b.clause);
  });

  fs.writeFileSync(path.join(OUT_DIR, 'b149-2-clauses.json'), JSON.stringify(clauses, null, 0));
  console.log(`B149.2: ${clauses.length} clauses written`);
}

function formatClauseNumber(key, section) {
  // Convert keys like "4_1_1" to "4.1.1", or named keys like "accessory" to "Section.name"
  if (/^\d/.test(key) || /^[A-Z]_\d/.test(key)) {
    return key.replace(/_/g, '.');
  }
  // Named clause (definition) - use section prefix + readable name
  return `${section}.${key}`;
}

// --- Run ---
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
processB149_1();
processB149_2();
console.log('Data processing complete.');