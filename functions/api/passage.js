const BIBLE_IDS = (env) => ({
  kjv:  env.BIBLE_ID_KJV,
  web:  env.BIBLE_ID_WEB,
  asv:  env.BIBLE_ID_ASV,
  nkjv: env.BIBLE_ID_NKJV,
})

const BOOK_MAP = {
  'genesis': 'GEN', 'gen': 'GEN',
  'exodus': 'EXO', 'exo': 'EXO', 'ex': 'EXO',
  'leviticus': 'LEV', 'lev': 'LEV',
  'numbers': 'NUM', 'num': 'NUM',
  'deuteronomy': 'DEU', 'deut': 'DEU', 'deu': 'DEU', 'dt': 'DEU',
  'joshua': 'JOS', 'josh': 'JOS', 'jos': 'JOS',
  'judges': 'JDG', 'judg': 'JDG', 'jdg': 'JDG',
  'ruth': 'RUT', 'rut': 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1sam': '1SA', '1 sam': '1SA', '1sa': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2sam': '2SA', '2 sam': '2SA', '2sa': '2SA',
  '1 kings': '1KI', '1kings': '1KI', '1kgs': '1KI', '1 kgs': '1KI', '1ki': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2kgs': '2KI', '2 kgs': '2KI', '2ki': '2KI',
  '1 chronicles': '1CH', '1chronicles': '1CH', '1chr': '1CH', '1 chr': '1CH', '1ch': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2chr': '2CH', '2 chr': '2CH', '2ch': '2CH',
  'ezra': 'EZR', 'ezr': 'EZR',
  'nehemiah': 'NEH', 'neh': 'NEH',
  'esther': 'EST', 'esth': 'EST', 'est': 'EST',
  'job': 'JOB',
  'psalms': 'PSA', 'psalm': 'PSA', 'psa': 'PSA', 'ps': 'PSA',
  'proverbs': 'PRO', 'prov': 'PRO', 'pro': 'PRO',
  'ecclesiastes': 'ECC', 'eccl': 'ECC', 'ecc': 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'song': 'SNG', 'sos': 'SNG', 'ss': 'SNG',
  'isaiah': 'ISA', 'isa': 'ISA',
  'jeremiah': 'JER', 'jer': 'JER',
  'lamentations': 'LAM', 'lam': 'LAM',
  'ezekiel': 'EZK', 'ezek': 'EZK', 'eze': 'EZK', 'ezk': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'joel': 'JOL', 'joe': 'JOL',
  'amos': 'AMO', 'amo': 'AMO',
  'obadiah': 'OBA', 'oba': 'OBA', 'obad': 'OBA',
  'jonah': 'JON', 'jon': 'JON',
  'micah': 'MIC', 'mic': 'MIC',
  'nahum': 'NAM', 'nah': 'NAM', 'nam': 'NAM',
  'habakkuk': 'HAB', 'hab': 'HAB',
  'zephaniah': 'ZEP', 'zeph': 'ZEP', 'zep': 'ZEP',
  'haggai': 'HAG', 'hag': 'HAG',
  'zechariah': 'ZEC', 'zech': 'ZEC', 'zec': 'ZEC',
  'malachi': 'MAL', 'mal': 'MAL',
  'matthew': 'MAT', 'matt': 'MAT', 'mat': 'MAT',
  'mark': 'MRK', 'mrk': 'MRK', 'mar': 'MRK',
  'luke': 'LUK', 'luk': 'LUK',
  'john': 'JHN', 'jhn': 'JHN', 'joh': 'JHN',
  'acts': 'ACT', 'act': 'ACT',
  'romans': 'ROM', 'rom': 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1cor': '1CO', '1 cor': '1CO', '1co': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2cor': '2CO', '2 cor': '2CO', '2co': '2CO',
  'galatians': 'GAL', 'gal': 'GAL',
  'ephesians': 'EPH', 'eph': 'EPH',
  'philippians': 'PHP', 'phil': 'PHP', 'php': 'PHP',
  'colossians': 'COL', 'col': 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1thes': '1TH', '1 thes': '1TH', '1th': '1TH', '1 th': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2thes': '2TH', '2 thes': '2TH', '2th': '2TH', '2 th': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1tim': '1TI', '1 tim': '1TI', '1ti': '1TI', '1 ti': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2tim': '2TI', '2 tim': '2TI', '2ti': '2TI', '2 ti': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'philemon': 'PHM', 'phm': 'PHM', 'phlm': 'PHM',
  'hebrews': 'HEB', 'heb': 'HEB',
  'james': 'JAS', 'jas': 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1pet': '1PE', '1 pet': '1PE', '1pe': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2pet': '2PE', '2 pet': '2PE', '2pe': '2PE',
  '1 john': '1JN', '1john': '1JN', '1jo': '1JN', '1 jo': '1JN', '1jn': '1JN',
  '2 john': '2JN', '2john': '2JN', '2jo': '2JN', '2 jo': '2JN', '2jn': '2JN',
  '3 john': '3JN', '3john': '3JN', '3jo': '3JN', '3 jo': '3JN', '3jn': '3JN',
  'jude': 'JUD', 'jud': 'JUD',
  'revelation': 'REV', 'revelations': 'REV', 'rev': 'REV',
}

function parseRef(passageRef) {
  const normalized = passageRef.trim().replace(/\s*[–—]\s*/g, '-').replace(/\s+-\s+/g, '-')

  const verseMatch = normalized.match(/^(.+?)\s+(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/i)
  if (verseMatch) {
    const [, book, ch1, v1, endCh, endV] = verseMatch
    const code = BOOK_MAP[book.toLowerCase().trim()]
    if (!code) return null
    const startId = `${code}.${ch1}.${v1}`
    return { id: endV ? `${startId}-${code}.${endCh ?? ch1}.${endV}` : startId, endpoint: 'passages' }
  }

  const chapterMatch = normalized.match(/^(.+?)\s+(\d+)$/i)
  if (chapterMatch) {
    const [, book, ch] = chapterMatch
    const code = BOOK_MAP[book.toLowerCase().trim()]
    if (!code) return null
    return { id: `${code}.${ch}`, endpoint: 'chapters' }
  }

  return null
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
}

const err = (status = 500) =>
  new Response(JSON.stringify({ error: true }), { status, headers: JSON_HEADERS })

export async function onRequestGet({ request, env }) {
  const { searchParams } = new URL(request.url)
  const trans = searchParams.get('trans')
  const ref   = searchParams.get('ref')

  if (!trans || !ref) return err(400)

  try {
    // NET Bible — labs.bible.org (server-side to avoid CORS)
    if (trans === 'net') {
      const res = await fetch(`https://labs.bible.org/api/?passage=${encodeURIComponent(ref)}&type=json`)
      if (!res.ok) return err()
      const verses = await res.json()
      const content = verses.map(v =>
        `<p class="p"><span class="v">${v.verse}</span>${v.text}</p>`
      ).join('')
      return new Response(JSON.stringify({
        content,
        copyright: 'Scripture quoted by permission. Quotations designated (NET) are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. http://netbible.com',
      }), { headers: JSON_HEADERS })
    }

    // API.Bible translations (KJV, WEB, ASV, NKJV)
    const bibleId = BIBLE_IDS(env)[trans]
    const apiKey  = env.API_BIBLE_KEY
    if (!bibleId || !apiKey) return err(400)

    const parsed = parseRef(ref)
    if (!parsed) return err(400)

    const params = new URLSearchParams({
      'content-type': 'html',
      'include-notes': 'false',
      'include-titles': 'false',
      'include-chapter-numbers': 'false',
      'include-verse-numbers': 'true',
      'include-verse-spans': 'false',
    })

    const base = `https://rest.api.bible/v1/bibles/${bibleId}`
    const url  = parsed.endpoint === 'chapters'
      ? `${base}/chapters/${parsed.id}?${params}`
      : `${base}/passages/${parsed.id}?${params}`

    const res = await fetch(url, { headers: { 'api-key': apiKey } })
    if (!res.ok) return err()

    const json = await res.json()
    return new Response(JSON.stringify({
      content:   json.data.content   ?? '',
      copyright: json.data.copyright ?? '',
    }), { headers: JSON_HEADERS })

  } catch {
    return err()
  }
}
