// JobLens frontend: browser interactions and calls to our secure Netlify function.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
let selectedImage = null;
let currentReport = null;
let activeTab = 'text';
const sampleText = `REMOTE DATA ENTRY ASSISTANT - URGENT HIRING! Earn $6,000 every week working just 2 hours per day. No interview or experience needed. You are GUARANTEED to be selected. Contact our HR manager on Telegram @hiringdesk immediately. To activate your employee account, pay a refundable $75 registration fee via gift card. Send your passport photo and bank account details today. Do not contact the company directly. Limited slots available!`;
function showError(message) { $('#form-error').textContent = message; $('#form-error').classList.remove('hidden'); }
function clearError() { $('#form-error').classList.add('hidden'); }
function selectTab(tab) {
  activeTab = tab;
  $$('.tab').forEach(button => { const active = button.dataset.tab === tab; button.classList.toggle('active', active); button.setAttribute('aria-selected', String(active)); });
  $$('.tab-panel').forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab));
}
$$('.tab').forEach(button => button.addEventListener('click', () => selectTab(button.dataset.tab)));
$('#job-text').addEventListener('input', () => $('#char-count').textContent = `${$('#job-text').value.length.toLocaleString()} / 16,000`);
$('#more-inputs').addEventListener('click', () => { $('#extra-fields').classList.toggle('hidden'); $('#more-arrow').textContent = $('#extra-fields').classList.contains('hidden') ? '⌄' : '⌃'; });
$('#sample-button').addEventListener('click', () => { selectTab('text'); $('#job-text').value = sampleText; $('#job-text').dispatchEvent(new Event('input')); clearError(); $('#job-text').focus(); });
function handleImage(file) {
  if (!file) return;
  if (!['image/png','image/jpeg','image/webp'].includes(file.type)) return showError('Please choose a PNG, JPG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) return showError('Image must be smaller than 5 MB.');
  clearError();
  const reader = new FileReader();
  reader.onload = () => { selectedImage = {dataUrl:reader.result,name:file.name}; $('#preview-img').src = reader.result; $('#image-name').textContent = file.name; $('#image-preview').classList.remove('hidden'); selectTab('image'); };
  reader.readAsDataURL(file);
}
$('#job-image').addEventListener('change', event => handleImage(event.target.files[0]));
$('#remove-image').addEventListener('click', () => { selectedImage = null; $('#job-image').value = ''; $('#preview-img').removeAttribute('src'); $('#image-preview').classList.add('hidden'); });
const dropzone = $('#dropzone');
['dragenter','dragover'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.add('dragging'); }));
['dragleave','drop'].forEach(name => dropzone.addEventListener(name, event => { event.preventDefault(); dropzone.classList.remove('dragging'); }));
dropzone.addEventListener('drop', event => handleImage(event.dataTransfer.files[0]));
function addText(parent, tag, text, className) { const el = document.createElement(tag); el.textContent = text; if (className) el.className = className; parent.appendChild(el); return el; }
function renderReport(report) {
  currentReport = report;
  const score = Math.min(100, Math.max(0, Number(report.cautionScore) || 0));
  const level = score >= 65 ? 'high' : score >= 30 ? 'medium' : 'low';
  const riskName = level === 'high' ? 'Multiple concerns found' : level === 'medium' ? 'Some concerns found' : 'Limited concerns identified';
  $('#risk-label').textContent = riskName;
  $('#result-headline').textContent = report.headline || 'Review these findings carefully';
  $('#result-summary').textContent = report.summary || 'Verify the employer independently before proceeding.';
  $('#risk-score').textContent = score;
  $('#meter-ring').style.setProperty('--score', score);
  $('#meter-ring').style.setProperty('--meter', level === 'high' ? '#df7058' : level === 'medium' ? '#db9b42' : '#388a5e');
  $('.verdict').className = 'verdict ' + level;
  const tags = $('#source-tags'); tags.replaceChildren();
  (report.sources || []).forEach(source => addText(tags, 'span', source));
  const findings = $('#findings-list'); findings.replaceChildren();
  const items = Array.isArray(report.findings) ? report.findings : [];
  $('#finding-count').textContent = `${items.length} found`;
  if (!items.length) addText(findings, 'p', 'No clear red flags were identified from the available information. This does not verify the job or employer.');
  items.forEach((item,index) => {
    const details = document.createElement('details'); details.className = 'finding'; if (index === 0) details.open = true;
    const summary = document.createElement('summary');
    addText(summary, 'span', String(item.severity || 'medium').toUpperCase(), 'severity ' + (['high','medium','low'].includes(item.severity) ? item.severity : 'medium'));
    addText(summary, 'span', item.title || 'Possible warning sign');
    details.appendChild(summary);
    const body = document.createElement('div'); body.className = 'finding-body';
    addText(body, 'p', item.explanation || 'Review this information carefully.');
    if (item.evidence) addText(body, 'blockquote', item.evidence);
    details.appendChild(body); findings.appendChild(details);
  });
  const steps = $('#steps-list'); steps.replaceChildren();
  (report.verificationSteps || []).forEach(step => addText(steps,'li',step));
  $('#extracted-text').textContent = report.extractedText ? `Text read from the source:\n${report.extractedText}` : 'No extractable text was returned.';
  $('#limitations').textContent = (report.limitations || []).join(' • ');
  $('#results').classList.remove('hidden');
  $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}
$('#job-form').addEventListener('submit', async event => {
  event.preventDefault(); clearError();
  const text = [$('#job-text').value.trim(), $('#extra-text').value.trim()].filter(Boolean).join('\n\n');
  const url = ($('#job-url').value.trim() || $('#extra-url').value.trim());
  if (!text && !url && !selectedImage) return showError('Add a job description, a job URL, or a screenshot to start.');
  if (url) { try { const parsed = new URL(url); if (!['https:','http:'].includes(parsed.protocol)) throw Error(); } catch { return showError('Enter a valid link beginning with https:// or http://'); } }
  $('#analyze-button').disabled = true; $('#analyze-button').textContent = 'Analyzing...';
  $('#results').classList.add('hidden'); $('#progress').classList.remove('hidden');
  $('#progress-title').textContent = 'Looking closer at this opportunity...';
  $('#progress-subtitle').textContent = 'Reading your input and checking for warning signs';
  $('#progress').scrollIntoView({behavior:'smooth',block:'center'});
  try {
    const response = await fetch('/.netlify/functions/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,url,image:selectedImage?.dataUrl || null})});
    let data; try { data = await response.json(); } catch { throw new Error('Could not connect to the analysis service. Deploy on Netlify and check your function configuration.'); }
    if (!response.ok) throw new Error(data.error || 'Analysis failed. Please try again.');
    renderReport(data);
  } catch(error) {
    if (text || url) { renderReport(buildLocalReport(text, url)); }
    else { showError('Image analysis requires the online AI service. You can still preview the image; add text from the screenshot to check it now.'); $('#form-error').scrollIntoView({behavior:'smooth',block:'center'}); }
  }
  finally { $('#progress').classList.add('hidden'); $('#analyze-button').disabled = false; $('#analyze-button').innerHTML = 'Check this job <span>→</span>'; }
});
$('#copy-report').addEventListener('click', async () => {
  if (!currentReport) return;
  const report = currentReport;
  const message = `JOBLENS ANALYSIS\n${report.headline}\nCaution score: ${report.cautionScore}/100 (not a probability)\n\n${report.summary}\n\nWARNINGS\n${(report.findings || []).map(f => `- ${f.title}: ${f.explanation}${f.evidence ? ` [${f.evidence}]` : ''}`).join('\n')}\n\nVERIFY NEXT\n${(report.verificationSteps || []).map((step,i)=>`${i+1}. ${step}`).join('\n')}\n\nScreening aid only. Verify independently.`;
  try { await navigator.clipboard.writeText(message); $('#copy-report').textContent = 'Copied ✓'; setTimeout(() => $('#copy-report').textContent = 'Copy report ↗', 1800); } catch { alert('Copy unavailable in this browser.'); }
});
$('#reset-button').addEventListener('click', () => { $('#results').classList.add('hidden'); $('#analyzer').scrollIntoView({behavior:'smooth'}); });

// Offline-friendly fallback: a transparent rule-based check, NOT an AI response.
// This runs only when the optional serverless AI endpoint is unavailable.
function buildLocalReport(text, url) {
  const source = text.toLowerCase();
  const patterns = [
    { re:/\b(registration|processing|training|application|verification|security|activation)\s*(fee|charge|deposit|payment)\b|\bpay\s+(a|the|an)?\s*(refundable|upfront|advance|registration)|\brefundable\s*\$?\d+|\bpay.*(gift card|crypto|bitcoin)/i, severity:'high', title:'Payment requested during recruitment', explanation:'Legitimate employers generally do not require applicants to pay to receive a job or an interview.' },
    { re:/\b(telegram|whatsapp)\b|\bdm\s+(me|us)\b|\bpersonal\s+(number|account)\b/i, severity:'medium', title:'Recruitment through informal messaging', explanation:'Messaging apps alone do not prove fraud, but verify the recruiter through an official company channel.' },
    { re:/\b(no interview|no experience needed|guaranteed (hire|job|selection)|100% guaranteed|instant hiring|selected without interview)\b/i, severity:'high', title:'Unusually easy or guaranteed hiring', explanation:'Guaranteed selection without a normal recruitment process deserves independent verification.' },
    { re:/\b(urgent|immediately|limited slots|act now|today only|within 24 hours|hurry)\b/i, severity:'medium', title:'Pressure to act quickly', explanation:'High-pressure language may discourage applicants from checking details.' },
    { re:/\b(passport|national id|nid|ssn|social security|bank account|credit card|otp|password)\b/i, severity:'high', title:'Sensitive personal or financial information', explanation:'Avoid sending identity documents, account details, or passwords before verifying the employer and purpose.' },
    { re:/\b(\$|usd|tk|bdt|৳)\s?\d[\d,]*\s*(per week|weekly|per day|daily).*\b(no experience|2 hours|1 hour)\b|\bearn\s+(\$|৳)\s?\d[\d,]*\s*(every week|per week|daily)/i, severity:'medium', title:'Earnings claim needs verification', explanation:'Compare the advertised pay and workload with comparable roles and the company’s official posting.' },
    { re:/\b(do not contact|don't contact|keep (this|it) secret|confidential offer)\b/i, severity:'high', title:'Discourages independent verification', explanation:'A genuine recruiter should not prevent you from verifying an offer with the employer.' },
    { re:/\b(gift cards?|wire transfer|western union|cryptocurrency|bitcoin|usdt)\b/i, severity:'high', title:'Unusual payment method mentioned', explanation:'Requests for gift cards, crypto, or transfers as part of hiring are major warning signs.' }
  ];
  const findings = [];
  for (const p of patterns) { const match = text.match(p.re); if (match) findings.push({severity:p.severity,title:p.title,explanation:p.explanation,evidence:match[0].slice(0,120)}); }
  if (url) {
    try { const parsed = new URL(url);
      if (parsed.protocol === 'http:') findings.push({severity:'medium',title:'Unencrypted job link',explanation:'The URL uses HTTP rather than HTTPS. Avoid entering personal details.',evidence:parsed.hostname});
      if (/^(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|shorturl\.at)$/i.test(parsed.hostname)) findings.push({severity:'medium',title:'Shortened destination link',explanation:'Shortened links hide the final website. Confirm where the link leads before opening it.',evidence:parsed.hostname});
    } catch {}
  }
  const score = Math.min(95,findings.reduce((n,f)=>n+(f.severity==='high'?24:13),0));
  const summary = findings.length ? `Found ${findings.length} potential warning sign${findings.length===1?'':'s'} based on visible text and URL patterns. These findings are prompts for verification, not proof of fraud.` : 'No listed warning patterns matched the provided text. This does not mean the employer or advertisement has been verified.';
  return { cautionScore:score, headline:findings.length?'A few things deserve a closer look':'No obvious patterns matched', summary, sources:[text?'Pasted text':'',url?'URL pattern':'','Local rules · AI unavailable'].filter(Boolean),findings,verificationSteps:['Find the vacancy on the employer’s official careers page.','Check the company domain and independently contact its HR team.','Never pay recruitment fees or share OTPs, passwords, or banking details.','Search for independent reports of the company and recruiter.'],extractedText:text || '',limitations:['Offline rule-based screening; not an AI assessment.','The link destination was not fetched or read in fallback mode.', 'Uploaded images are not analyzed in fallback mode.','No company identity or job legitimacy has been verified.'] };
}

// Interactive safety-tip slider. Each click changes the displayed advice.
const safetyTips = [
  {title:'Verify the employer',body:'Look for the vacancy on the company’s official careers page and check whether the recruiter works there.'},
  {title:'Never pay to get hired',body:'Registration fees, security deposits, gift cards, or crypto payments during hiring are strong reasons to stop and verify.'},
  {title:'Protect your information',body:'Do not share passwords, OTPs, banking credentials, or identity documents with unverified recruiters.'}
];
let currentTip = 0;
function showSafetyTip(index) {
  currentTip = (index + safetyTips.length) % safetyTips.length;
  document.getElementById('tip-title').textContent = safetyTips[currentTip].title;
  document.getElementById('tip-body').textContent = safetyTips[currentTip].body;
  document.getElementById('tip-count').textContent = `TIP 0${currentTip + 1} / 03`;
  document.querySelectorAll('.tip-dot').forEach((dot, i) => dot.classList.toggle('selected', i === currentTip));
}
document.getElementById('tip-prev').addEventListener('click', () => showSafetyTip(currentTip - 1));
document.getElementById('tip-next').addEventListener('click', () => showSafetyTip(currentTip + 1));
document.querySelectorAll('.tip-dot').forEach(dot => dot.addEventListener('click', () => showSafetyTip(Number(dot.dataset.tip))));
