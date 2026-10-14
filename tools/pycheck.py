import json
import sqlite3
import subprocess
import sys

jobs = json.load(open(sys.argv[1]))
res = []
for j in jobs:
    k = j["k"]
    try:
        if j["kind"] == "py":
            src = open(j["path"]).read()
            compile(src, j["path"], "exec")
            if j.get("run"):
                p = subprocess.run([sys.executable, "-I", j["path"]], capture_output=True, text=True, timeout=15)
                if p.returncode != 0:
                    res.append({"k": k, "ok": False, "msg": "runtime error:\n" + p.stderr[-1500:]})
                    continue
            res.append({"k": k, "ok": True})
        elif j["kind"] == "sql":
            con = sqlite3.connect(":memory:")
            if j.get("schema"):
                try:
                    con.executescript(j["schema"])
                except Exception as e:
                    res.append({"k": k, "ok": False, "msg": "SCHEMA error (databases." + str(j.get("db")) + "): " + str(e)})
                    continue
            con.executescript(j["code"])
            res.append({"k": k, "ok": True})
    except subprocess.TimeoutExpired:
        res.append({"k": k, "ok": False, "msg": "timed out after 15s"})
    except Exception as e:
        res.append({"k": k, "ok": False, "msg": type(e).__name__ + ": " + str(e)})
print(json.dumps(res))
