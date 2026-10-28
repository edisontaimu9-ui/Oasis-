#!/usr/bin/env python3
"""
Generate one real HTML page per Oasis section from index.html.

    python3 tools/build_pages.py

index.html remains the source of truth (it is the Home page). Every other page
is a copy of it with its own <title>/meta/canonical and its own section opened
on load, plus a tiny router that keeps the address bar in sync when the user
switches sections (no reload, so in-memory state such as the last calculation
is preserved). Re-running the script is safe: the router block is replaced,
never duplicated.
"""
import re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://oasiscnst.app/"

# tab id -> (file, short title, description)
PAGES = {
    "home":        ("index.html",          "Home", None),
    "calculator":  ("adult.html",          "Adult Calculator", "Adult ICU and ward energy, protein and fluid calculator with refeeding-risk alerts."),
    "pedi":        ("pediatric.html",      "Pediatric Nutrition", "Pediatric nutrition tools: growth charts, requirements, SAM/MAM, burns and renal support."),
    "enteral":     ("enteral.html",        "Enteral Feeding", "Enteral feeding planner: formula selection, rate, advancement and tolerance guidance."),
    "parenteral":  ("parenteral.html",     "Parenteral Nutrition", "Parenteral nutrition calculator and monitoring guidance."),
    "anthro":      ("anthropometry.html",  "Anthropometry", "Anthropometric assessment: BMI, MUAC, weight change, estimated height and weight."),
    "nfpe":        ("nfpe.html",           "NFPE", "Nutrition-focused physical exam checklist and documentation."),
    "screening":   ("screening.html",      "Nutrition Screening", "Validated malnutrition screening tools for adults, children and pregnancy."),
    "assessments": ("assessments.html",    "Assessments", "Nutrition assessment workflow: history, exam, calculation and results."),
    "dni":         ("drug-nutrient.html",  "Drug-Nutrient Interactions", "Drug-nutrient interaction lookup."),
    "recall":      ("recall.html",         "24-Hour Recall", "24-hour dietary recall with nutrient analysis."),
    "mealplan":    ("meal-planner.html",   "Meal Planner", "Meal plan generator with nutrient targets."),
    "recipe":      ("recipes.html",        "Recipe Calculator", "Recipe nutrient calculator."),
    "database":    ("food-database.html",  "Food Database", "Searchable food composition database."),
    "history":     ("history.html",        "History", "Saved calculations on this device."),
    "reference":   ("reference.html",      "Reference", "Clinical nutrition reference tables and guidelines."),
    "news":        ("news.html",           "Nutrition News", "Latest clinical nutrition news."),
    "library":     ("library.html",        "Library", "Your saved guideline documents and resources."),
}

START, END = "<!-- OASIS-ROUTER:START -->", "<!-- OASIS-ROUTER:END -->"

def router(tab):
    routes = {k: v[0] for k, v in PAGES.items()}
    titles = {k: ("Oasis — " + v[1] if k != "home" else None) for k, v in PAGES.items()}
    import json
    return f"""{START}
<script>
(function(){{
  var PAGE={json.dumps(tab)}, ROUTES={json.dumps(routes)}, TITLES={json.dumps(titles)};
  var HOME_TITLE=document.title;
  function urlFor(n){{ return n==='home' ? '/' : '/'+ROUTES[n]; }}
  function tabFromPath(p){{
    p=p.replace(/\\/index\\.html$/,'/');
    if(p==='/'||p==='') return 'home';
    var f=p.replace(/^\\//,'').replace(/\\/$/,''); if(!/\\.html$/.test(f)) f+='.html';
    for(var k in ROUTES) if(ROUTES[k]===f) return k;
    return null;
  }}
  window.OASIS_ROUTES=ROUTES; window.OASIS_PAGE=PAGE;
  window.addEventListener('load',function(){{
    var orig=window.switchTab; if(typeof orig!=='function') return;
    var popping=false;
    window.switchTab=function(name){{
      var r=orig.apply(this,arguments);
      try{{
        if(ROUTES[name]){{
          document.title=TITLES[name]||HOME_TITLE;
          var u=urlFor(name);
          if(!popping && location.pathname!==u) history.pushState({{tab:name}},'',u+location.search);
        }}
      }}catch(e){{}}
      return r;
    }};
    window.addEventListener('popstate',function(e){{
      var n=(e.state&&e.state.tab)||tabFromPath(location.pathname)||'home';
      popping=true; try{{ window.switchTab(n); }}finally{{ popping=false; }}
    }});
    var start=tabFromPath(location.pathname)||PAGE;   // also lets the SW serve the shell for any section URL offline
    try{{ history.replaceState({{tab:start}},'',location.pathname+location.search+location.hash); }}catch(e){{}}
    if(start!=='home'||PAGE!=='home') window.switchTab(start);
  }});
}})();
</script>
{END}
"""

def build():
    src = (ROOT / "index.html").read_text(encoding="utf-8")
    src = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", src, flags=re.S)
    assert "</body>" in src
    written = []
    for tab, (fname, label, desc) in PAGES.items():
        html = src
        if tab != "home":
            url = BASE + fname
            title = f"Oasis — {label} | Clinical Nutrition Decision Support"
            html = re.sub(r"<title>.*?</title>", lambda m: f"<title>{title}</title>", html, count=1, flags=re.S)
            html = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1)+desc+m.group(2), html, count=1)
            html = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1)+title+m.group(2), html, count=1)
            html = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1)+desc+m.group(2), html, count=1)
            html = re.sub(r'(<meta property="og:url" content=")[^"]*(")', lambda m: m.group(1)+url+m.group(2), html, count=1)
            html = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1)+title+m.group(2), html, count=1)
            html = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', lambda m: m.group(1)+desc+m.group(2), html, count=1)
            html = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1)+url+m.group(2), html, count=1)
            # open this page's section immediately (no flash of Home)
            html = html.replace('<div class="main active" id="tab-home"', '<div class="main" id="tab-home"', 1)
            html = re.sub(r'<div class="main" id="tab-%s"' % re.escape(tab),
                          '<div class="main active" id="tab-%s"' % tab, html, count=1)
        i = html.rindex("</body>")
        html = html[:i] + router(tab) + html[i:]
        (ROOT / fname).write_text(html, encoding="utf-8")
        written.append(fname)
    # sitemap
    today = datetime.date.today().isoformat()
    urls = "".join(
        f"  <url>\n    <loc>{BASE if t=='home' else BASE+f}</loc>\n    <lastmod>{today}</lastmod>\n"
        f"    <changefreq>weekly</changefreq>\n    <priority>{'1.0' if t=='home' else '0.7'}</priority>\n  </url>\n"
        for t, (f, _, _) in PAGES.items())
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n",
        encoding="utf-8")
    print("wrote", len(written), "pages + sitemap.xml")

if __name__ == "__main__":
    build()
