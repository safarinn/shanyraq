"""Integration tests use a temporary database; no packages required."""
import http.cookiejar,json,os,socket,subprocess,sys,tempfile,time,unittest
from datetime import date,timedelta
from pathlib import Path
from urllib.error import HTTPError,URLError
from urllib.request import Request,build_opener,HTTPCookieProcessor
ROOT=Path(__file__).resolve().parents[1]
class Client:
 def __init__(self,url):self.url=url;self.csrf='';self.opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def call(self,path,data=None):
  headers={'Content-Type':'application/json','X-CSRF-Token':self.csrf}
  req=Request(self.url+'/api/'+path,data=json.dumps(data).encode() if data is not None else None,headers=headers)
  try:
   with self.opener.open(req) as r:status=r.status;result=json.load(r)
  except HTTPError as e:status=e.code;result=json.load(e)
  if 'csrf' in result:self.csrf=result['csrf']
  return status,result
class PortalTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory()
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  cls.url=f'http://127.0.0.1:{port}';env=os.environ.copy();env['SHANYRAQ_DB']=str(Path(cls.tmp.name)/'test.sqlite3')
  cls.process=subprocess.Popen([sys.executable,str(ROOT/'server.py'),'--port',str(port)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for _ in range(100):
   try:
    if Client(cls.url).call('session')[0]==200:break
   except URLError:time.sleep(.05)
  else:raise RuntimeError('Server failed to start')
 @classmethod
 def tearDownClass(cls):cls.process.terminate();cls.process.wait();cls.tmp.cleanup()
 def test_end_to_end(self):
  guest=Client(self.url);user=Client(self.url);admin=Client(self.url)
  items=guest.call('properties')[1]['items'];self.assertEqual(len(items),8);pid=items[0]['id']
  self.assertEqual(guest.call('bookings')[0],401)
  signup={'first_name':'Nurali','last_name':'Muratov','email':'test@example.com','password':'Test2026!','confirm':'Test2026!','phone':'+7 700 123 45 67'}
  bad=[('email','invalid'),('first_name',''),('last_name',''),('password','short'),('confirm','different'),('phone','abc')]
  for key,value in bad:
   with self.subTest(validation=key):self.assertEqual(guest.call('register',{**signup,key:value})[0],400)
  self.assertEqual(user.call('register',signup)[0],200)
  self.assertEqual(guest.call('register',signup)[0],409)
  self.assertEqual(guest.call('login',{'email':'missing@example.com','password':'Test2026!'})[0],401)
  self.assertEqual(guest.call('login',{'email':'test@example.com','password':'wrong'})[0],401)
  self.assertEqual(user.call('admin/overview')[0],403)
  self.assertEqual(user.call('admin/delete',{'id':pid})[0],403)
  self.assertEqual(user.call('profile',{'first_name':'Nuraly','last_name':'Muratov','phone':'+7 700 123 45 67'})[0],200)
  self.assertEqual(user.call('session')[1]['user']['first_name'],'Nuraly')
  self.assertIn(pid,user.call('favorites',{'property_id':pid})[1]['ids'])
  booking={'property_id':pid,'visit_date':str(date.today()+timedelta(days=2)),'visit_time':'12:00','phone':'+7 700 123 45 67','message':'Please show the house.'}
  self.assertEqual(user.call('bookings',{**booking,'visit_date':str(date.today())})[0],400)
  self.assertEqual(user.call('bookings',{**booking,'visit_time':'99:00'})[0],400)
  self.assertEqual(user.call('bookings',{**booking,'phone':'bad'})[0],400)
  status,result=user.call('bookings',booking);self.assertEqual(status,201);bid=result['id']
  self.assertEqual(user.call('bookings',booking)[0],409)
  self.assertEqual(user.call('bookings')[1]['items'][0]['id'],bid)
  self.assertEqual(admin.call('login',{'email':'admin@shanyraq.kz','password':'Admin2026!'})[0],200)
  self.assertEqual(len(admin.call('admin/overview')[1]['users']),2)
  self.assertEqual(admin.call('admin/status',{'id':bid,'status':'Подтверждена'})[0],200)
  self.assertEqual(user.call('bookings')[1]['items'][0]['status'],'Подтверждена')
  self.assertEqual(user.call('cancel',{'id':bid})[0],200)
  prop={**items[0],'id':'','title':'New demonstration apartment'}
  self.assertEqual(admin.call('admin/property',{**prop,'price':-1})[0],400)
  self.assertEqual(admin.call('admin/property',prop)[0],200)
  new=admin.call('properties')[1]['items'][0];self.assertEqual(new['title'],prop['title'])
  self.assertEqual(admin.call('admin/property',{**new,'title':'Updated property'})[0],200)
  self.assertEqual(admin.call('properties')[1]['items'][0]['title'],'Updated property')
  self.assertEqual(admin.call('admin/delete',{'id':new['id']})[0],200)
  self.assertEqual(admin.call('admin/delete',{'id':pid})[0],200)
  self.assertIsNone(user.call('bookings')[1]['items'][0]['property_id'])
  self.assertNotIn(pid,user.call('favorites')[1]['ids'])
  old=user.csrf;user.csrf='wrong';self.assertEqual(user.call('profile',{'first_name':'Hack','last_name':'Test','phone':''})[0],403);user.csrf=old
  self.assertEqual(user.call('logout',{})[0],200);self.assertEqual(user.call('bookings')[0],401)
  self.assertEqual(user.call('login',{'email':'test@example.com','password':'Test2026!'})[0],200)
 def test_static_pages_and_assets(self):
  import re
  for file in (ROOT/'public').glob('*.html'):
   with build_opener().open(self.url+'/'+file.name) as response:
    self.assertEqual(response.status,200);html=response.read().decode()
   self.assertIn('<main',html);self.assertIn('<footer',html);self.assertIn('lang="ru"',html)
   for path in re.findall(r'(?:href|src)="([^"?]+)"',html):
    if path.startswith('#'): continue
    self.assertTrue((ROOT/'public'/path).exists(),path)
  js='\n'.join(file.read_text() for file in (ROOT/'public/js').glob('*.js'))
  for target in re.findall(r'href="([a-z]+\.html)',js):self.assertTrue((ROOT/'public'/target).exists(),target)
 def test_readable_frontend_structure(self):
  import re
  from html.parser import HTMLParser
  class Inspector(HTMLParser):
   def __init__(self): super().__init__(); self.ids=set(); self.duplicates=[]
   def handle_starttag(self, tag, attrs):
    keys=[name for name,value in attrs]
    if len(keys)!=len(set(keys)): self.duplicates.append(tag)
    for name,value in attrs:
     if name=='id': self.ids.add(value)
  files={'catalog':['index','catalog'],'auth':['login','register'],'details':['details'],'profile':['profile'],'favorites':['favorites'],'admin':['admin']}
  shared=(ROOT/'public/js/common.js').read_text()
  for script,pages in files.items():
   source=(ROOT/'public/js'/f'{script}.js').read_text()
   for page in pages:
    inspector=Inspector(); inspector.feed((ROOT/'public'/f'{page}.html').read_text())
    self.assertEqual(inspector.duplicates, [], page)
    ids=re.findall(r"getElementById\('([^']+)'\)",source+shared)
    for id in ids:
     if id=='property-template' and page not in ['index','catalog','favorites']: continue
     self.assertIn(id,inspector.ids,(page,id))
  css=(ROOT/'public/css/style.css').read_text()
  self.assertNotRegex(css,r'(?i)display\s*:\s*(inline-)?grid|grid-template|grid-column')
  self.assertIn('flex-wrap: wrap',css)
if __name__=='__main__':unittest.main(verbosity=2)
