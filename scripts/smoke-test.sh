#!/usr/bin/env bash
# تست سریع جریان کامل API (پایه‌ی smoke test)
set -euo pipefail
BASE=${BASE:-http://127.0.0.1:4000}

echo "== health =="
curl -s "$BASE/api/health" | head -c 300; echo

echo "== login =="
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'content-type: application/json' \
  -d '{"username":"admin","password":"Admin@1234"}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
echo "token: ${TOKEN:0:24}..."

AUTH="Authorization: Bearer $TOKEN"

echo "== overview =="
curl -s "$BASE/api/admin/overview" -H "$AUTH" | head -c 400; echo

echo "== exams =="
curl -s "$BASE/api/admin/exams" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('exams:',j.items.map(i=>i.title+' ['+i.accessCode+'] q='+i.questionCount).join(' | '))})"

CODE=$(curl -s "$BASE/api/admin/exams" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.items.find(i=>i.type==='EXAM').accessCode)})")
echo "exam code: $CODE"

echo "== resolve =="
curl -s -X POST "$BASE/api/public/resolve" -H 'content-type: application/json' -d "{\"code\":\"$CODE\"}" | head -c 400; echo

echo "== start attempt =="
ATTEMPT=$(curl -s -X POST "$BASE/api/public/attempts" -H 'content-type: application/json' \
  -d "{\"accessCode\":\"$CODE\",\"name\":\"رضا محمدی\",\"email\":\"reza@example.com\",\"phone\":\"09120000000\",\"nationalCode\":\"0012345678\"}")
echo "$ATTEMPT" | head -c 300; echo
ATOKEN=$(echo "$ATTEMPT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
AID=$(echo "$ATTEMPT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).attemptId))")

echo "== attempt state =="
STATE=$(curl -s "$BASE/api/public/attempts/$AID" -H "X-Attempt-Token: $ATOKEN")
echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('questions:',j.questions.length,'first:',j.questions[0].title.slice(0,40),'options:',JSON.stringify(j.questions[0].options.map(o=>o.id)))})"

Q1=$(echo "$STATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const q=j.questions.find(x=>x.type==='MULTIPLE_CHOICE');console.log(q.id+'|'+q.options.find(o=>true).id)})")
QID=${Q1%%|*}; OPT=${Q1##*|}
echo "answering q=$QID opt=$OPT"
curl -s -X PUT "$BASE/api/public/attempts/$AID/answers/$QID" -H "X-Attempt-Token: $ATOKEN" -H 'content-type: application/json' -d "{\"value\":\"$OPT\"}"; echo

echo "== submit =="
curl -s -X POST "$BASE/api/public/attempts/$AID/submit" -H "X-Attempt-Token: $ATOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('score:',j.result.score,'/',j.result.maxScore,'passed:',j.result.passed,'status:',j.result.status)})"

echo "== admin attempts =="
curl -s "$BASE/api/admin/attempts?examId=$(curl -s "$BASE/api/admin/exams" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.items.find(i=>i.type==='EXAM').id)})")" -H "$AUTH" | head -c 300; echo

echo "== analytics =="
EID=$(curl -s "$BASE/api/admin/exams" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j.items.find(i=>i.type==='EXAM').id)})")
curl -s "$BASE/api/admin/results/exams/$EID/analytics" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('totals:',JSON.stringify(j.totals));console.log('q1:',j.questions[0].title.slice(0,30),'correctRate:',j.questions[0].correctRate)})"

echo "== csv export =="
curl -s "$BASE/api/admin/results/exams/$EID/export.csv" -H "$AUTH" | head -c 300; echo

echo "== AI status/demo =="
curl -s "$BASE/api/admin/ai/status" -H "$AUTH"; echo
curl -s -X POST "$BASE/api/admin/ai/generate" -H "$AUTH" -H 'content-type: application/json' \
  -d '{"topic":"مبانی شبکه","questionCount":3,"types":["MULTIPLE_CHOICE"],"difficulty":3}' | head -c 400; echo

echo "== OK =="
