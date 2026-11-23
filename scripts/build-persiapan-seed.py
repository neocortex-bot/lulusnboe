# Generates src/data/persiapanSeed.json from the PIKiR PADi PDF text (pdftotext -layout).
import re, json, uuid, sys, subprocess
pdf=sys.argv[1] if len(sys.argv)>1 else '/mnt/user-uploads/PIKiR_PADi_-_IZZAN.pdf'
lines=subprocess.check_output(['pdftotext','-layout',pdf,'-'],text=True).splitlines()
cards=[];div=None;cur=None;mode=None
catmap={'Ekokardiografi':'ekokardiografi','Intervensi':'intervensi','Vaskular':'vaskular','IACC':'iacc','Pediatri':'pediatri','Aritmia':'aritmia','Aritmia / Karklin':'aritmia','Rehab & Prevensi':'rehab_prevensi','Karklin':'karklin','Tambahan':'tambahan'}
for l in lines:
  s=l.strip()
  m=re.match(r'0[45] • Kartu skill \| (.+?)( \(lanjutan\))?$',s)
  if m: div=catmap[m.group(1)]; mode=None; continue
  if s.startswith('05 •'): break
  m=re.match(r'(\d\d) / \d+ kata / ±\d+ detik( \| INVASIF)?',s)
  if m and div:
    cur={'no':int(m.group(1)),'div':div,'inv':bool(m.group(2)),'title':'','pikir':'','padi':''};cards.append(cur);mode='title';continue
  if not cur or not s or s.startswith('Latihan ujian') or s.startswith('NBOE /') or s.startswith('Ucapkan PIKiR'): continue
  if s.startswith('PIKiR —'): mode='pikir'; s=s[7:].strip()
  elif s.startswith('PADi'): mode='padi'; s=re.sub(r'^PADi \(P/A\) —','',s).strip()
  if mode: cur[mode]=(cur[mode]+' '+s).strip()
assert len(cards)==48,len(cards)
def sents(t): return [x.strip() for x in re.split(r'(?<=[.;])\s+(?=[A-Z])',t) if x.strip()]
out=[]
for c in cards:
  ps=sents(c['pikir'])
  ri=next((i for i in range(len(ps)-1,0,-1) if re.search(r'[Rr]isiko|[Mm]ungkin|terasa|aman',ps[i])),len(ps)-1)
  proc=ps[0]; risk=' '.join(ps[ri:]); kontra=' '.join(ps[1:ri]) or 'Kondisi khusus pasien perlu dinilai dahulu sebelum mulai.'
  padi=re.sub(r'\s*Di: frasa universal\.?','',c['padi']).strip()
  mm=re.search(r'[Ss]iapkan',padi)
  pos=padi[:mm.start()].strip(' ;,') if mm else padi
  alat=padi[mm.start():].strip() if mm else padi
  it=[
   ('Menyapa dan memperkenalkan diri sebagai dokter\nSKOR: 1 = menyapa dan menyebut diri dokter; 0 = tidak',1,False,'Selamat pagi, saya dokter yang akan memeriksa Bapak/Ibu.'),
   ('P – Prosedur & I – Indikasi: menjelaskan tindakan dan tujuannya dengan bahasa awam\nSKOR: 2 = prosedur dan tujuan jelas; 1 = salah satu; 0 = tidak',2,False,proc),
   ('Ki – Kontraindikasi: menyebut kondisi yang perlu dinilai sebelum mulai\nSKOR: 2 = menyebut kondisi relevan; 1 = umum/samar; 0 = tidak',2,False,kontra),
   ('R – Risiko/komplikasi yang nyata dan proporsional\nSKOR: 2 = risiko relevan disebut; 1 = sebagian/samar; 0 = tidak',2,False,risk),
   ('Meminta izin dan verifikasi identitas (nama dan tanggal lahir), menunggu jawaban\nSKOR: 2 = izin dan identitas; 1 = salah satu; 0 = tidak',2,True,'Saya dokter, boleh saya lakukan? Mohon sebutkan nama dan tanggal lahir Bapak/Ibu.'),
   ('P – Pasien: posisi, privasi dan persiapan keselamatan pasien\nSKOR: 2 = posisi/persiapan tepat; 1 = sebagian; 0 = tidak',2,False,pos or padi),
   ('A – Alat: menyebut alat utama dan kelayakannya\nSKOR: 2 = alat utama lengkap; 1 = sebagian; 0 = tidak',2,False,alat),
   ('Di – Diri: cuci tangan enam langkah dan APD sesuai risiko\nSKOR: 2 = keduanya; 1 = salah satu; 0 = tidak',2,False,'Cuci tangan enam langkah, APD sesuai risiko.'),
  ]
  if c['inv']: it.append(('Teknik aseptik dan sarung tangan steril (tindakan invasif)\nSKOR: 2 = asepsis dan sarung tangan steril; 1 = salah satu; 0 = tidak',2,True,'Cuci tangan, APD, asepsis dan sarung tangan steril.'))
  items=[{'id':str(uuid.uuid5(uuid.NAMESPACE_URL,f"persiapan-{c['no']}-{i}")),'text':t,'points':p,'isCritical':cr,'answer':a} for i,(t,p,cr,a) in enumerate(it)]
  out.append({'no':c['no'],'title':f"Persiapan {c['no']:02d} – {c['title']}",'category':c['div'],'invasive':c['inv'],
   'questions_text':f"Lafalkan persiapan untuk melakukan {c['title']}. Mulai dari menyapa pasien hingga berhenti tepat sebelum prosedur dimulai.",
   'items':items})
json.dump(out,open('src/data/persiapanSeed.json','w'),ensure_ascii=False,indent=1)
print(len(out))
