// 公开契约与统计：无 DOM、无网络，也不从发帖或核对日期推断执行。
const FIELDS = {
 root:['calendar_schema_version','generated_at','checked_at_range','coverage','events','sources','unlinked_sources'],
 range:['min','max'], coverage:['protocol_versions','notes'],
 event:['id','reset_kind','status','executed_at','planned_at','previous_planned_at','eligibility_summary','source_ids','verification','display_date','display_basis'],
 source:['id','url','text','published_at','publication_basis','text_completeness','verification','versions'],
 version:['text','published_at','publication_basis','text_completeness','verification'],
 unlinked:['source_id','mentioned_at','display_date','display_basis'], verification:['state','fields'],temporal:['value','precision'],
};
const VERIFY={event:['association','reset_kind','status','executed_at','planned_at','previous_planned_at','eligibility_summary'],source:['association','revision','text','published_at','text_completeness'],version:['revision','text','published_at','text_completeness']};
const fail=()=>{throw new Error('public_data_invalid');};
function require(value){if(!value)fail();}
function exact(value,kind){
 require(value!==null&&typeof value==='object'&&!Array.isArray(value));
 const optional=kind==='source'&&Object.hasOwn(value,'summary_zh')?['summary_zh']:[];
 require(canonical(Object.keys(value).sort())===canonical([...FIELDS[kind],...optional].sort()));
}
function enumValue(value,values){require(typeof value==='string'&&values.includes(value));}
function text(value,nullable=false){require(nullable&&value===null||typeof value==='string'&&!PYTHON_ONLY_WHITESPACE.test(value));}
function codePointOrder(a,b){const x=[...a],y=[...b];for(let i=0;i<Math.min(x.length,y.length);i++){const delta=x[i].codePointAt(0)-y[i].codePointAt(0);if(delta)return delta;}return x.length-y.length;}
function uniqueSorted(values){require(Array.isArray(values)&&values.every(v=>typeof v==='string')&&canonical(values)===canonical([...new Set(values)].sort(codePointOrder)));}
function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
function validDate(value,nullable=true){
 if(value===null&&nullable)return;
 require(typeof value==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value));
 const [y,m,d]=value.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0);
 require(y>=1&&m>=1&&m<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]);
}
function timestamp(value,{seconds=false,nullable=false}={}){
 if(value===null&&nullable)return;
 const pattern=seconds?/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\+08:00$/:/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(?::[0-9]{2})?\+08:00$/;
 require(typeof value==='string'&&pattern.test(value));validDate(value.slice(0,10),false);
 require(Number(value.slice(11,13))<24&&Number(value.slice(14,16))<60&&((!/^:/.test(value.slice(16))||Number(value.slice(17,19))<60)));
}
function temporal(value){
 if(value===null)return;
 exact(value,'temporal');enumValue(value.precision,['date','minute','second']);
 if(value.precision==='date')validDate(value.value,false);
 else {timestamp(value.value,{seconds:value.precision==='second'});require(value.value.length===(value.precision==='minute'?22:25));}
}
// Match the binding Python Unicode 15.0 predicates explicitly. JS \s, /i and \b
// have different meanings; never normalize or replace the original public text.
// Word ranges are the complete Python str.isalnum() set plus ASCII underscore.
const PYTHON_SPACE_CHARS="\\u0009-\\u000d\\u001c-\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const PYTHON_WORD_CHARS=[
 "\\u{30}-\\u{39}\\u{41}-\\u{5a}\\u{5f}\\u{61}-\\u{7a}\\u{aa}\\u{b2}-\\u{b3}\\u{b5}\\u{b9}-\\u{ba}",
 "\\u{bc}-\\u{be}\\u{c0}-\\u{d6}\\u{d8}-\\u{f6}\\u{f8}-\\u{2c1}\\u{2c6}-\\u{2d1}\\u{2e0}-\\u{2e4}\\u{2ec}\\u{2ee}",
 "\\u{370}-\\u{374}\\u{376}-\\u{377}\\u{37a}-\\u{37d}\\u{37f}\\u{386}\\u{388}-\\u{38a}\\u{38c}\\u{38e}-\\u{3a1}",
 "\\u{3a3}-\\u{3f5}\\u{3f7}-\\u{481}\\u{48a}-\\u{52f}\\u{531}-\\u{556}\\u{559}\\u{560}-\\u{588}\\u{5d0}-\\u{5ea}\\u{5ef}-\\u{5f2}",
 "\\u{620}-\\u{64a}\\u{660}-\\u{669}\\u{66e}-\\u{66f}\\u{671}-\\u{6d3}\\u{6d5}\\u{6e5}-\\u{6e6}\\u{6ee}-\\u{6fc}\\u{6ff}",
 "\\u{710}\\u{712}-\\u{72f}\\u{74d}-\\u{7a5}\\u{7b1}\\u{7c0}-\\u{7ea}\\u{7f4}-\\u{7f5}\\u{7fa}\\u{800}-\\u{815}",
 "\\u{81a}\\u{824}\\u{828}\\u{840}-\\u{858}\\u{860}-\\u{86a}\\u{870}-\\u{887}\\u{889}-\\u{88e}\\u{8a0}-\\u{8c9}",
 "\\u{904}-\\u{939}\\u{93d}\\u{950}\\u{958}-\\u{961}\\u{966}-\\u{96f}\\u{971}-\\u{980}\\u{985}-\\u{98c}\\u{98f}-\\u{990}",
 "\\u{993}-\\u{9a8}\\u{9aa}-\\u{9b0}\\u{9b2}\\u{9b6}-\\u{9b9}\\u{9bd}\\u{9ce}\\u{9dc}-\\u{9dd}\\u{9df}-\\u{9e1}",
 "\\u{9e6}-\\u{9f1}\\u{9f4}-\\u{9f9}\\u{9fc}\\u{a05}-\\u{a0a}\\u{a0f}-\\u{a10}\\u{a13}-\\u{a28}\\u{a2a}-\\u{a30}\\u{a32}-\\u{a33}",
 "\\u{a35}-\\u{a36}\\u{a38}-\\u{a39}\\u{a59}-\\u{a5c}\\u{a5e}\\u{a66}-\\u{a6f}\\u{a72}-\\u{a74}\\u{a85}-\\u{a8d}\\u{a8f}-\\u{a91}",
 "\\u{a93}-\\u{aa8}\\u{aaa}-\\u{ab0}\\u{ab2}-\\u{ab3}\\u{ab5}-\\u{ab9}\\u{abd}\\u{ad0}\\u{ae0}-\\u{ae1}\\u{ae6}-\\u{aef}",
 "\\u{af9}\\u{b05}-\\u{b0c}\\u{b0f}-\\u{b10}\\u{b13}-\\u{b28}\\u{b2a}-\\u{b30}\\u{b32}-\\u{b33}\\u{b35}-\\u{b39}\\u{b3d}",
 "\\u{b5c}-\\u{b5d}\\u{b5f}-\\u{b61}\\u{b66}-\\u{b6f}\\u{b71}-\\u{b77}\\u{b83}\\u{b85}-\\u{b8a}\\u{b8e}-\\u{b90}\\u{b92}-\\u{b95}",
 "\\u{b99}-\\u{b9a}\\u{b9c}\\u{b9e}-\\u{b9f}\\u{ba3}-\\u{ba4}\\u{ba8}-\\u{baa}\\u{bae}-\\u{bb9}\\u{bd0}\\u{be6}-\\u{bf2}",
 "\\u{c05}-\\u{c0c}\\u{c0e}-\\u{c10}\\u{c12}-\\u{c28}\\u{c2a}-\\u{c39}\\u{c3d}\\u{c58}-\\u{c5a}\\u{c5d}\\u{c60}-\\u{c61}",
 "\\u{c66}-\\u{c6f}\\u{c78}-\\u{c7e}\\u{c80}\\u{c85}-\\u{c8c}\\u{c8e}-\\u{c90}\\u{c92}-\\u{ca8}\\u{caa}-\\u{cb3}\\u{cb5}-\\u{cb9}",
 "\\u{cbd}\\u{cdd}-\\u{cde}\\u{ce0}-\\u{ce1}\\u{ce6}-\\u{cef}\\u{cf1}-\\u{cf2}\\u{d04}-\\u{d0c}\\u{d0e}-\\u{d10}\\u{d12}-\\u{d3a}",
 "\\u{d3d}\\u{d4e}\\u{d54}-\\u{d56}\\u{d58}-\\u{d61}\\u{d66}-\\u{d78}\\u{d7a}-\\u{d7f}\\u{d85}-\\u{d96}\\u{d9a}-\\u{db1}",
 "\\u{db3}-\\u{dbb}\\u{dbd}\\u{dc0}-\\u{dc6}\\u{de6}-\\u{def}\\u{e01}-\\u{e30}\\u{e32}-\\u{e33}\\u{e40}-\\u{e46}\\u{e50}-\\u{e59}",
 "\\u{e81}-\\u{e82}\\u{e84}\\u{e86}-\\u{e8a}\\u{e8c}-\\u{ea3}\\u{ea5}\\u{ea7}-\\u{eb0}\\u{eb2}-\\u{eb3}\\u{ebd}",
 "\\u{ec0}-\\u{ec4}\\u{ec6}\\u{ed0}-\\u{ed9}\\u{edc}-\\u{edf}\\u{f00}\\u{f20}-\\u{f33}\\u{f40}-\\u{f47}\\u{f49}-\\u{f6c}",
 "\\u{f88}-\\u{f8c}\\u{1000}-\\u{102a}\\u{103f}-\\u{1049}\\u{1050}-\\u{1055}\\u{105a}-\\u{105d}\\u{1061}\\u{1065}-\\u{1066}\\u{106e}-\\u{1070}",
 "\\u{1075}-\\u{1081}\\u{108e}\\u{1090}-\\u{1099}\\u{10a0}-\\u{10c5}\\u{10c7}\\u{10cd}\\u{10d0}-\\u{10fa}\\u{10fc}-\\u{1248}",
 "\\u{124a}-\\u{124d}\\u{1250}-\\u{1256}\\u{1258}\\u{125a}-\\u{125d}\\u{1260}-\\u{1288}\\u{128a}-\\u{128d}\\u{1290}-\\u{12b0}\\u{12b2}-\\u{12b5}",
 "\\u{12b8}-\\u{12be}\\u{12c0}\\u{12c2}-\\u{12c5}\\u{12c8}-\\u{12d6}\\u{12d8}-\\u{1310}\\u{1312}-\\u{1315}\\u{1318}-\\u{135a}\\u{1369}-\\u{137c}",
 "\\u{1380}-\\u{138f}\\u{13a0}-\\u{13f5}\\u{13f8}-\\u{13fd}\\u{1401}-\\u{166c}\\u{166f}-\\u{167f}\\u{1681}-\\u{169a}\\u{16a0}-\\u{16ea}\\u{16ee}-\\u{16f8}",
 "\\u{1700}-\\u{1711}\\u{171f}-\\u{1731}\\u{1740}-\\u{1751}\\u{1760}-\\u{176c}\\u{176e}-\\u{1770}\\u{1780}-\\u{17b3}\\u{17d7}\\u{17dc}",
 "\\u{17e0}-\\u{17e9}\\u{17f0}-\\u{17f9}\\u{1810}-\\u{1819}\\u{1820}-\\u{1878}\\u{1880}-\\u{1884}\\u{1887}-\\u{18a8}\\u{18aa}\\u{18b0}-\\u{18f5}",
 "\\u{1900}-\\u{191e}\\u{1946}-\\u{196d}\\u{1970}-\\u{1974}\\u{1980}-\\u{19ab}\\u{19b0}-\\u{19c9}\\u{19d0}-\\u{19da}\\u{1a00}-\\u{1a16}\\u{1a20}-\\u{1a54}",
 "\\u{1a80}-\\u{1a89}\\u{1a90}-\\u{1a99}\\u{1aa7}\\u{1b05}-\\u{1b33}\\u{1b45}-\\u{1b4c}\\u{1b50}-\\u{1b59}\\u{1b83}-\\u{1ba0}\\u{1bae}-\\u{1be5}",
 "\\u{1c00}-\\u{1c23}\\u{1c40}-\\u{1c49}\\u{1c4d}-\\u{1c7d}\\u{1c80}-\\u{1c88}\\u{1c90}-\\u{1cba}\\u{1cbd}-\\u{1cbf}\\u{1ce9}-\\u{1cec}\\u{1cee}-\\u{1cf3}",
 "\\u{1cf5}-\\u{1cf6}\\u{1cfa}\\u{1d00}-\\u{1dbf}\\u{1e00}-\\u{1f15}\\u{1f18}-\\u{1f1d}\\u{1f20}-\\u{1f45}\\u{1f48}-\\u{1f4d}\\u{1f50}-\\u{1f57}",
 "\\u{1f59}\\u{1f5b}\\u{1f5d}\\u{1f5f}-\\u{1f7d}\\u{1f80}-\\u{1fb4}\\u{1fb6}-\\u{1fbc}\\u{1fbe}\\u{1fc2}-\\u{1fc4}",
 "\\u{1fc6}-\\u{1fcc}\\u{1fd0}-\\u{1fd3}\\u{1fd6}-\\u{1fdb}\\u{1fe0}-\\u{1fec}\\u{1ff2}-\\u{1ff4}\\u{1ff6}-\\u{1ffc}\\u{2070}-\\u{2071}\\u{2074}-\\u{2079}",
 "\\u{207f}-\\u{2089}\\u{2090}-\\u{209c}\\u{2102}\\u{2107}\\u{210a}-\\u{2113}\\u{2115}\\u{2119}-\\u{211d}\\u{2124}",
 "\\u{2126}\\u{2128}\\u{212a}-\\u{212d}\\u{212f}-\\u{2139}\\u{213c}-\\u{213f}\\u{2145}-\\u{2149}\\u{214e}\\u{2150}-\\u{2189}",
 "\\u{2460}-\\u{249b}\\u{24ea}-\\u{24ff}\\u{2776}-\\u{2793}\\u{2c00}-\\u{2ce4}\\u{2ceb}-\\u{2cee}\\u{2cf2}-\\u{2cf3}\\u{2cfd}\\u{2d00}-\\u{2d25}",
 "\\u{2d27}\\u{2d2d}\\u{2d30}-\\u{2d67}\\u{2d6f}\\u{2d80}-\\u{2d96}\\u{2da0}-\\u{2da6}\\u{2da8}-\\u{2dae}\\u{2db0}-\\u{2db6}",
 "\\u{2db8}-\\u{2dbe}\\u{2dc0}-\\u{2dc6}\\u{2dc8}-\\u{2dce}\\u{2dd0}-\\u{2dd6}\\u{2dd8}-\\u{2dde}\\u{2e2f}\\u{3005}-\\u{3007}\\u{3021}-\\u{3029}",
 "\\u{3031}-\\u{3035}\\u{3038}-\\u{303c}\\u{3041}-\\u{3096}\\u{309d}-\\u{309f}\\u{30a1}-\\u{30fa}\\u{30fc}-\\u{30ff}\\u{3105}-\\u{312f}\\u{3131}-\\u{318e}",
 "\\u{3192}-\\u{3195}\\u{31a0}-\\u{31bf}\\u{31f0}-\\u{31ff}\\u{3220}-\\u{3229}\\u{3248}-\\u{324f}\\u{3251}-\\u{325f}\\u{3280}-\\u{3289}\\u{32b1}-\\u{32bf}",
 "\\u{3400}-\\u{4dbf}\\u{4e00}-\\u{a48c}\\u{a4d0}-\\u{a4fd}\\u{a500}-\\u{a60c}\\u{a610}-\\u{a62b}\\u{a640}-\\u{a66e}\\u{a67f}-\\u{a69d}\\u{a6a0}-\\u{a6ef}",
 "\\u{a717}-\\u{a71f}\\u{a722}-\\u{a788}\\u{a78b}-\\u{a7ca}\\u{a7d0}-\\u{a7d1}\\u{a7d3}\\u{a7d5}-\\u{a7d9}\\u{a7f2}-\\u{a801}\\u{a803}-\\u{a805}",
 "\\u{a807}-\\u{a80a}\\u{a80c}-\\u{a822}\\u{a830}-\\u{a835}\\u{a840}-\\u{a873}\\u{a882}-\\u{a8b3}\\u{a8d0}-\\u{a8d9}\\u{a8f2}-\\u{a8f7}\\u{a8fb}",
 "\\u{a8fd}-\\u{a8fe}\\u{a900}-\\u{a925}\\u{a930}-\\u{a946}\\u{a960}-\\u{a97c}\\u{a984}-\\u{a9b2}\\u{a9cf}-\\u{a9d9}\\u{a9e0}-\\u{a9e4}\\u{a9e6}-\\u{a9fe}",
 "\\u{aa00}-\\u{aa28}\\u{aa40}-\\u{aa42}\\u{aa44}-\\u{aa4b}\\u{aa50}-\\u{aa59}\\u{aa60}-\\u{aa76}\\u{aa7a}\\u{aa7e}-\\u{aaaf}\\u{aab1}",
 "\\u{aab5}-\\u{aab6}\\u{aab9}-\\u{aabd}\\u{aac0}\\u{aac2}\\u{aadb}-\\u{aadd}\\u{aae0}-\\u{aaea}\\u{aaf2}-\\u{aaf4}\\u{ab01}-\\u{ab06}",
 "\\u{ab09}-\\u{ab0e}\\u{ab11}-\\u{ab16}\\u{ab20}-\\u{ab26}\\u{ab28}-\\u{ab2e}\\u{ab30}-\\u{ab5a}\\u{ab5c}-\\u{ab69}\\u{ab70}-\\u{abe2}\\u{abf0}-\\u{abf9}",
 "\\u{ac00}-\\u{d7a3}\\u{d7b0}-\\u{d7c6}\\u{d7cb}-\\u{d7fb}\\u{f900}-\\u{fa6d}\\u{fa70}-\\u{fad9}\\u{fb00}-\\u{fb06}\\u{fb13}-\\u{fb17}\\u{fb1d}",
 "\\u{fb1f}-\\u{fb28}\\u{fb2a}-\\u{fb36}\\u{fb38}-\\u{fb3c}\\u{fb3e}\\u{fb40}-\\u{fb41}\\u{fb43}-\\u{fb44}\\u{fb46}-\\u{fbb1}\\u{fbd3}-\\u{fd3d}",
 "\\u{fd50}-\\u{fd8f}\\u{fd92}-\\u{fdc7}\\u{fdf0}-\\u{fdfb}\\u{fe70}-\\u{fe74}\\u{fe76}-\\u{fefc}\\u{ff10}-\\u{ff19}\\u{ff21}-\\u{ff3a}\\u{ff41}-\\u{ff5a}",
 "\\u{ff66}-\\u{ffbe}\\u{ffc2}-\\u{ffc7}\\u{ffca}-\\u{ffcf}\\u{ffd2}-\\u{ffd7}\\u{ffda}-\\u{ffdc}\\u{10000}-\\u{1000b}\\u{1000d}-\\u{10026}\\u{10028}-\\u{1003a}",
 "\\u{1003c}-\\u{1003d}\\u{1003f}-\\u{1004d}\\u{10050}-\\u{1005d}\\u{10080}-\\u{100fa}\\u{10107}-\\u{10133}\\u{10140}-\\u{10178}\\u{1018a}-\\u{1018b}\\u{10280}-\\u{1029c}",
 "\\u{102a0}-\\u{102d0}\\u{102e1}-\\u{102fb}\\u{10300}-\\u{10323}\\u{1032d}-\\u{1034a}\\u{10350}-\\u{10375}\\u{10380}-\\u{1039d}\\u{103a0}-\\u{103c3}\\u{103c8}-\\u{103cf}",
 "\\u{103d1}-\\u{103d5}\\u{10400}-\\u{1049d}\\u{104a0}-\\u{104a9}\\u{104b0}-\\u{104d3}\\u{104d8}-\\u{104fb}\\u{10500}-\\u{10527}\\u{10530}-\\u{10563}\\u{10570}-\\u{1057a}",
 "\\u{1057c}-\\u{1058a}\\u{1058c}-\\u{10592}\\u{10594}-\\u{10595}\\u{10597}-\\u{105a1}\\u{105a3}-\\u{105b1}\\u{105b3}-\\u{105b9}\\u{105bb}-\\u{105bc}\\u{10600}-\\u{10736}",
 "\\u{10740}-\\u{10755}\\u{10760}-\\u{10767}\\u{10780}-\\u{10785}\\u{10787}-\\u{107b0}\\u{107b2}-\\u{107ba}\\u{10800}-\\u{10805}\\u{10808}\\u{1080a}-\\u{10835}",
 "\\u{10837}-\\u{10838}\\u{1083c}\\u{1083f}-\\u{10855}\\u{10858}-\\u{10876}\\u{10879}-\\u{1089e}\\u{108a7}-\\u{108af}\\u{108e0}-\\u{108f2}\\u{108f4}-\\u{108f5}",
 "\\u{108fb}-\\u{1091b}\\u{10920}-\\u{10939}\\u{10980}-\\u{109b7}\\u{109bc}-\\u{109cf}\\u{109d2}-\\u{10a00}\\u{10a10}-\\u{10a13}\\u{10a15}-\\u{10a17}\\u{10a19}-\\u{10a35}",
 "\\u{10a40}-\\u{10a48}\\u{10a60}-\\u{10a7e}\\u{10a80}-\\u{10a9f}\\u{10ac0}-\\u{10ac7}\\u{10ac9}-\\u{10ae4}\\u{10aeb}-\\u{10aef}\\u{10b00}-\\u{10b35}\\u{10b40}-\\u{10b55}",
 "\\u{10b58}-\\u{10b72}\\u{10b78}-\\u{10b91}\\u{10ba9}-\\u{10baf}\\u{10c00}-\\u{10c48}\\u{10c80}-\\u{10cb2}\\u{10cc0}-\\u{10cf2}\\u{10cfa}-\\u{10d23}\\u{10d30}-\\u{10d39}",
 "\\u{10e60}-\\u{10e7e}\\u{10e80}-\\u{10ea9}\\u{10eb0}-\\u{10eb1}\\u{10f00}-\\u{10f27}\\u{10f30}-\\u{10f45}\\u{10f51}-\\u{10f54}\\u{10f70}-\\u{10f81}\\u{10fb0}-\\u{10fcb}",
 "\\u{10fe0}-\\u{10ff6}\\u{11003}-\\u{11037}\\u{11052}-\\u{1106f}\\u{11071}-\\u{11072}\\u{11075}\\u{11083}-\\u{110af}\\u{110d0}-\\u{110e8}\\u{110f0}-\\u{110f9}",
 "\\u{11103}-\\u{11126}\\u{11136}-\\u{1113f}\\u{11144}\\u{11147}\\u{11150}-\\u{11172}\\u{11176}\\u{11183}-\\u{111b2}\\u{111c1}-\\u{111c4}",
 "\\u{111d0}-\\u{111da}\\u{111dc}\\u{111e1}-\\u{111f4}\\u{11200}-\\u{11211}\\u{11213}-\\u{1122b}\\u{1123f}-\\u{11240}\\u{11280}-\\u{11286}\\u{11288}",
 "\\u{1128a}-\\u{1128d}\\u{1128f}-\\u{1129d}\\u{1129f}-\\u{112a8}\\u{112b0}-\\u{112de}\\u{112f0}-\\u{112f9}\\u{11305}-\\u{1130c}\\u{1130f}-\\u{11310}\\u{11313}-\\u{11328}",
 "\\u{1132a}-\\u{11330}\\u{11332}-\\u{11333}\\u{11335}-\\u{11339}\\u{1133d}\\u{11350}\\u{1135d}-\\u{11361}\\u{11400}-\\u{11434}\\u{11447}-\\u{1144a}",
 "\\u{11450}-\\u{11459}\\u{1145f}-\\u{11461}\\u{11480}-\\u{114af}\\u{114c4}-\\u{114c5}\\u{114c7}\\u{114d0}-\\u{114d9}\\u{11580}-\\u{115ae}\\u{115d8}-\\u{115db}",
 "\\u{11600}-\\u{1162f}\\u{11644}\\u{11650}-\\u{11659}\\u{11680}-\\u{116aa}\\u{116b8}\\u{116c0}-\\u{116c9}\\u{11700}-\\u{1171a}\\u{11730}-\\u{1173b}",
 "\\u{11740}-\\u{11746}\\u{11800}-\\u{1182b}\\u{118a0}-\\u{118f2}\\u{118ff}-\\u{11906}\\u{11909}\\u{1190c}-\\u{11913}\\u{11915}-\\u{11916}\\u{11918}-\\u{1192f}",
 "\\u{1193f}\\u{11941}\\u{11950}-\\u{11959}\\u{119a0}-\\u{119a7}\\u{119aa}-\\u{119d0}\\u{119e1}\\u{119e3}\\u{11a00}",
 "\\u{11a0b}-\\u{11a32}\\u{11a3a}\\u{11a50}\\u{11a5c}-\\u{11a89}\\u{11a9d}\\u{11ab0}-\\u{11af8}\\u{11c00}-\\u{11c08}\\u{11c0a}-\\u{11c2e}",
 "\\u{11c40}\\u{11c50}-\\u{11c6c}\\u{11c72}-\\u{11c8f}\\u{11d00}-\\u{11d06}\\u{11d08}-\\u{11d09}\\u{11d0b}-\\u{11d30}\\u{11d46}\\u{11d50}-\\u{11d59}",
 "\\u{11d60}-\\u{11d65}\\u{11d67}-\\u{11d68}\\u{11d6a}-\\u{11d89}\\u{11d98}\\u{11da0}-\\u{11da9}\\u{11ee0}-\\u{11ef2}\\u{11f02}\\u{11f04}-\\u{11f10}",
 "\\u{11f12}-\\u{11f33}\\u{11f50}-\\u{11f59}\\u{11fb0}\\u{11fc0}-\\u{11fd4}\\u{12000}-\\u{12399}\\u{12400}-\\u{1246e}\\u{12480}-\\u{12543}\\u{12f90}-\\u{12ff0}",
 "\\u{13000}-\\u{1342f}\\u{13441}-\\u{13446}\\u{14400}-\\u{14646}\\u{16800}-\\u{16a38}\\u{16a40}-\\u{16a5e}\\u{16a60}-\\u{16a69}\\u{16a70}-\\u{16abe}\\u{16ac0}-\\u{16ac9}",
 "\\u{16ad0}-\\u{16aed}\\u{16b00}-\\u{16b2f}\\u{16b40}-\\u{16b43}\\u{16b50}-\\u{16b59}\\u{16b5b}-\\u{16b61}\\u{16b63}-\\u{16b77}\\u{16b7d}-\\u{16b8f}\\u{16e40}-\\u{16e96}",
 "\\u{16f00}-\\u{16f4a}\\u{16f50}\\u{16f93}-\\u{16f9f}\\u{16fe0}-\\u{16fe1}\\u{16fe3}\\u{17000}-\\u{187f7}\\u{18800}-\\u{18cd5}\\u{18d00}-\\u{18d08}",
 "\\u{1aff0}-\\u{1aff3}\\u{1aff5}-\\u{1affb}\\u{1affd}-\\u{1affe}\\u{1b000}-\\u{1b122}\\u{1b132}\\u{1b150}-\\u{1b152}\\u{1b155}\\u{1b164}-\\u{1b167}",
 "\\u{1b170}-\\u{1b2fb}\\u{1bc00}-\\u{1bc6a}\\u{1bc70}-\\u{1bc7c}\\u{1bc80}-\\u{1bc88}\\u{1bc90}-\\u{1bc99}\\u{1d2c0}-\\u{1d2d3}\\u{1d2e0}-\\u{1d2f3}\\u{1d360}-\\u{1d378}",
 "\\u{1d400}-\\u{1d454}\\u{1d456}-\\u{1d49c}\\u{1d49e}-\\u{1d49f}\\u{1d4a2}\\u{1d4a5}-\\u{1d4a6}\\u{1d4a9}-\\u{1d4ac}\\u{1d4ae}-\\u{1d4b9}\\u{1d4bb}",
 "\\u{1d4bd}-\\u{1d4c3}\\u{1d4c5}-\\u{1d505}\\u{1d507}-\\u{1d50a}\\u{1d50d}-\\u{1d514}\\u{1d516}-\\u{1d51c}\\u{1d51e}-\\u{1d539}\\u{1d53b}-\\u{1d53e}\\u{1d540}-\\u{1d544}",
 "\\u{1d546}\\u{1d54a}-\\u{1d550}\\u{1d552}-\\u{1d6a5}\\u{1d6a8}-\\u{1d6c0}\\u{1d6c2}-\\u{1d6da}\\u{1d6dc}-\\u{1d6fa}\\u{1d6fc}-\\u{1d714}\\u{1d716}-\\u{1d734}",
 "\\u{1d736}-\\u{1d74e}\\u{1d750}-\\u{1d76e}\\u{1d770}-\\u{1d788}\\u{1d78a}-\\u{1d7a8}\\u{1d7aa}-\\u{1d7c2}\\u{1d7c4}-\\u{1d7cb}\\u{1d7ce}-\\u{1d7ff}\\u{1df00}-\\u{1df1e}",
 "\\u{1df25}-\\u{1df2a}\\u{1e030}-\\u{1e06d}\\u{1e100}-\\u{1e12c}\\u{1e137}-\\u{1e13d}\\u{1e140}-\\u{1e149}\\u{1e14e}\\u{1e290}-\\u{1e2ad}\\u{1e2c0}-\\u{1e2eb}",
 "\\u{1e2f0}-\\u{1e2f9}\\u{1e4d0}-\\u{1e4eb}\\u{1e4f0}-\\u{1e4f9}\\u{1e7e0}-\\u{1e7e6}\\u{1e7e8}-\\u{1e7eb}\\u{1e7ed}-\\u{1e7ee}\\u{1e7f0}-\\u{1e7fe}\\u{1e800}-\\u{1e8c4}",
 "\\u{1e8c7}-\\u{1e8cf}\\u{1e900}-\\u{1e943}\\u{1e94b}\\u{1e950}-\\u{1e959}\\u{1ec71}-\\u{1ecab}\\u{1ecad}-\\u{1ecaf}\\u{1ecb1}-\\u{1ecb4}\\u{1ed01}-\\u{1ed2d}",
 "\\u{1ed2f}-\\u{1ed3d}\\u{1ee00}-\\u{1ee03}\\u{1ee05}-\\u{1ee1f}\\u{1ee21}-\\u{1ee22}\\u{1ee24}\\u{1ee27}\\u{1ee29}-\\u{1ee32}\\u{1ee34}-\\u{1ee37}",
 "\\u{1ee39}\\u{1ee3b}\\u{1ee42}\\u{1ee47}\\u{1ee49}\\u{1ee4b}\\u{1ee4d}-\\u{1ee4f}\\u{1ee51}-\\u{1ee52}",
 "\\u{1ee54}\\u{1ee57}\\u{1ee59}\\u{1ee5b}\\u{1ee5d}\\u{1ee5f}\\u{1ee61}-\\u{1ee62}\\u{1ee64}",
 "\\u{1ee67}-\\u{1ee6a}\\u{1ee6c}-\\u{1ee72}\\u{1ee74}-\\u{1ee77}\\u{1ee79}-\\u{1ee7c}\\u{1ee7e}\\u{1ee80}-\\u{1ee89}\\u{1ee8b}-\\u{1ee9b}\\u{1eea1}-\\u{1eea3}",
 "\\u{1eea5}-\\u{1eea9}\\u{1eeab}-\\u{1eebb}\\u{1f100}-\\u{1f10c}\\u{1fbf0}-\\u{1fbf9}\\u{20000}-\\u{2a6df}\\u{2a700}-\\u{2b739}\\u{2b740}-\\u{2b81d}\\u{2b820}-\\u{2cea1}",
 "\\u{2ceb0}-\\u{2ebe0}\\u{2f800}-\\u{2fa1d}\\u{30000}-\\u{3134a}\\u{31350}-\\u{323af}"
].join('');
const PYTHON_WHITESPACE=new RegExp(`[${PYTHON_SPACE_CHARS}]`,'u');
const PYTHON_ONLY_WHITESPACE=new RegExp(`^[${PYTHON_SPACE_CHARS}]*$`,'u');
const PYTHON_WORD_CLASS=`[${PYTHON_WORD_CHARS}]`;
const PYTHON_WORD_BOUNDARY=`(?:(?<!${PYTHON_WORD_CLASS})(?=${PYTHON_WORD_CLASS})|(?<=${PYTHON_WORD_CLASS})(?!${PYTHON_WORD_CLASS}))`;
function foldedAsciiLetter(char,inClass){
 const lower=char.toLowerCase(),upper=char.toUpperCase();
 const extra={i:'İı',s:'ſ',k:'K'}[lower]||'';
 const characters=lower+upper+extra;
 return inClass?characters:`[${characters}]`;
}
// Translate only the constructs used by the fixed public sensitive-pattern set.
// Case folding is explicit so newer browser Unicode tables cannot change it.
function pythonPattern(source,ignoreCase=false){
 let output='',inClass=false;
 for(let i=0;i<source.length;i++){
  const char=source[i];
  if(char==='\\'){
   const escape=source[++i];
   if(escape==='b')output+=PYTHON_WORD_BOUNDARY;
   else if(escape==='s')output+=inClass?PYTHON_SPACE_CHARS:`[${PYTHON_SPACE_CHARS}]`;
   else if(escape==='S')output+=`[^${PYTHON_SPACE_CHARS}]`;
   else output+='\\'+escape;
  }else if(char==='['){inClass=true;output+=char;}
  else if(char===']'){inClass=false;output+=char;}
  else if(ignoreCase&&inClass&&(source.slice(i,i+3)==='A-Z'||source.slice(i,i+3)==='a-z')){output+='A-Za-zİıſK';i+=2;}
  else if(ignoreCase&&/[A-Za-z]/.test(char))output+=foldedAsciiLetter(char,inClass);
  else output+=char;
 }
 return new RegExp(output,'u');
}
const SENSITIVE=[
 pythonPattern("[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\\.[A-Z0-9-]+)+",true),
 pythonPattern("(?:QQ\\s*(?:群(?:号|号码)?|group(?:\\s*ID)?|账号|account)|群号)\\s*[:：=#]?\\s*[0-9]{5,}",true),
 pythonPattern("(?:^|\\n)\\s*(?:MIME-Version|Content-Type|Content-Transfer-Encoding|Message-ID|Received|From|To):",true),
 pythonPattern("(?:/(?:app|root|home|tmp|var|etc|workspace|srv|opt)/(?:[^\\s]*))|(?:\\b[A-Z]:[\\\\/])",true),
 pythonPattern("\\b(?:token|api[_-]?key|access[_-]?key|secret|password|authorization|cookie|session)\\b\\s*[:=]\\s*\\S+|\\bBearer\\s+\\S+",true),
 pythonPattern("\\b(?:sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9]{12,}|github_pat_[A-Za-z0-9_]{12,}|eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\\b"),
 pythonPattern("\\b(?:message_key|event_key|payload_fingerprint|raw_mime|imap_uid|qq_group)\\b\\s*[:=]",true)
];
function scan(value){
 if(typeof value==='string'){
  require(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(value));
  for(let i=0;i<value.length;i++){const n=value.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){require(i+1<value.length&&value.charCodeAt(i+1)>=0xdc00&&value.charCodeAt(i+1)<=0xdfff);i++;}else require(n<0xdc00||n>0xdfff);}
  require(!SENSITIVE.some(p=>p.test(value)));
 }else if(Array.isArray(value))value.forEach(scan);
 else if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){scan(k);scan(v);}
}
function ipv4Global(host){
 if(!/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(host))return false;
 const a=host.split('.').map(Number);if(a.some(n=>n>255))return false;
 const [x,y,z,w]=a;
 if(x===192&&y===0&&z===0&&(w===9||w===10))return true;
 return !(x===0||x===10||x===127||x>=224||x===100&&y>=64&&y<=127||x===169&&y===254||x===172&&y>=16&&y<=31||x===192&&(y===168||y===0&&(z===0||z===2))||x===198&&(y===18||y===19||y===51&&z===100)||x===203&&y===0&&z===113);
}
function ipv6Number(host){
 const halves=host.toLowerCase().split('::');if(halves.length>2)fail();
 const left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
 let groups=halves.length===2?[...left,...Array(8-left.length-right.length).fill('0'),...right]:left;
 require(groups.length===8&&groups.every(g=>/^[0-9a-f]{1,4}$/.test(g)));
 return groups.reduce((v,g)=>(v<<16n)+BigInt('0x'+g),0n);
}
function ipv6Global(host){
 const n=ipv6Number(host),inNet=(prefix,bits)=>n>>BigInt(128-bits)===ipv6Number(prefix)>>BigInt(128-bits);
 if(inNet('::ffff:0:0',96))return ipv4Global([24n,16n,8n,0n].map(shift=>String((n>>shift)&255n)).join('.'));
 const exceptions=[['2001:1::1',128],['2001:1::2',128],['2001:3::',32],['2001:4:112::',48],['2001:20::',28],['2001:30::',28]];
 if(exceptions.some(([p,b])=>inNet(p,b)))return true;
 return !([['::',128],['::1',128],['64:ff9b:1::',48],['100::',64],['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20],['fc00::',7],['fe80::',10],['ff00::',8]].some(([p,b])=>inNet(p,b)));
}
const URL_CREDENTIAL_NAMES=new Set([
 'token','accesstoken','refreshtoken','idtoken','authtoken','bearertoken',
 'apitoken','apikey','accesskey','accesskeyid','secretaccesskey','secret',
 'clientsecret','apisecret','password','passwd','pwd','authorization','auth',
 'cookie','session','sessionid','sessiontoken','sessionkey','authkey',
 'privatekey','securitytoken','clientassertion','oauthtoken','oauthtokensecret',
 'awsaccesskeyid','xamzcredential','xamzsignature','xamzsecuritytoken',
 'googleaccessid','xgoogcredential','xgoogsignature','xgoogsecuritytoken','signature','sig'
]);
function safeURLParameters(component,fragment=false){
 // 只检查，不改写原 URL。byte 解码与 Python 相同；percent 替换严格缩短字符串。
 while(true){
  const decoded=component.replace(/%([0-9A-Fa-f]{2})/g,(_,hex)=>String.fromCharCode(parseInt(hex,16))).replace(/\+/g,' ');
  if(decoded===component)break;component=decoded;
 }
 return component.split(/[&;?]/).every(parameter=>fragment&&!parameter.includes('=')||!URL_CREDENTIAL_NAMES.has(parameter.split('=')[0].replace(/[ \t\r\n_-]/g,'').toLowerCase()));
}
// 链接在模型入口和创建 DOM 链接时分别验证；保留原 URL 字节。
export function safeSourceURL(value){
 try{
  require(typeof value==='string'&&!PYTHON_WHITESPACE.test(value)&&!/[\u0000-\u001f\u007f-\u009f\\]/u.test(value));
  const match=/^(https?):\/\/([^/?#]+)(.*)$/i.exec(value);require(match);
  const authority=match[2];require(/^[\x00-\x7f]*$/.test(authority)&&!authority.includes('%'));
  require(authority.startsWith('[')?/^\[[0-9A-Fa-f:.]+\](?::[0-9]*)?$/.test(authority):/^[A-Za-z0-9.-]+(?::[0-9]*)?$/.test(authority));
  const parsed=new URL(value);require(!parsed.username&&!parsed.password);
  const rawHost=authority.startsWith('[')?authority.slice(1,authority.indexOf(']')):authority.split(':')[0];
  const host=rawHost.toLowerCase().replace(/\.+$/,'');
  require(host!=='localhost'&&!/\.(localhost|local|internal)$/.test(host));
  if(host.includes(':'))require(ipv6Global(parsed.hostname.slice(1,-1)));
  else if(/^(?:0[xX][0-9a-fA-F]*|[0-9]+)(?:\.(?:0[xX][0-9a-fA-F]*|[0-9]+))*$/.test(host))require(ipv4Global(host));
  const suffix=match[3],hash=suffix.indexOf('#'),beforeHash=hash<0?suffix:suffix.slice(0,hash),query=beforeHash.indexOf('?');
  require(safeURLParameters(query<0?'':beforeHash.slice(query+1))&&safeURLParameters(hash<0?'':suffix.slice(hash+1),true));
  return true;
 }catch{return false;}
}
function sourceKey(value){
 const [,scheme,authority,suffix]=/^(https?):\/\/([^/?#]+)(.*)$/i.exec(value);
 const host=authority.startsWith('[')?authority.slice(1,authority.indexOf(']')).toLowerCase():authority.split(':')[0].toLowerCase();
 const hostEnd=authority.startsWith('[')?authority.indexOf(']')+1:host.length;
 const rawPort=authority.slice(hostEnd),port=rawPort&&rawPort!==':'?Number(rawPort.slice(1)):null;
 const isDefault=port!==null&&((scheme.toLowerCase()==='https'&&port===443)||(scheme.toLowerCase()==='http'&&port===80));
 if(['x.com','twitter.com','www.x.com','www.twitter.com','mobile.twitter.com'].includes(host)&&(port===null||isDefault)){
  const path=suffix.split(/[?#]/)[0],match=/^\/(?:[^/]+\/status|i\/web\/status)\/([0-9]+)\/?$/.exec(path);if(match)return 'x:'+match[1];
 }
 return 'url:'+scheme.toLowerCase()+'://'+(host.includes(':')?'['+host+']':host)+(isDefault?'':rawPort)+suffix;
}
// 小型同步 SHA-256，用于验证公开来源 ID，不依赖浏览器权限或 Node 专用模块。
function sha256(text){
 const bytes=new TextEncoder().encode(text),size=Math.ceil((bytes.length+9)/64)*64,buffer=new Uint8Array(size);buffer.set(bytes);buffer[bytes.length]=128;
 const view=new DataView(buffer.buffer);view.setBigUint64(size-8,BigInt(bytes.length)*8n);
 const initial=[],constants=[];for(let n=2;constants.length<64;n++){let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break;}if(prime){if(initial.length<8)initial.push((Math.sqrt(n)%1*2**32)>>>0);constants.push((Math.cbrt(n)%1*2**32)>>>0);}}
 const h=initial,w=new Uint32Array(64),rotr=(x,n)=>(x>>>n)|(x<<(32-n));
 for(let offset=0;offset<size;offset+=64){
  for(let i=0;i<16;i++)w[i]=view.getUint32(offset+4*i);
  for(let i=16;i<64;i++)w[i]=(w[i-16]+(rotr(w[i-15],7)^rotr(w[i-15],18)^(w[i-15]>>>3))+w[i-7]+(rotr(w[i-2],17)^rotr(w[i-2],19)^(w[i-2]>>>10)))>>>0;
  let [a,b,c,d,e,f,g,j]=h;
  for(let i=0;i<64;i++){const t1=(j+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+constants[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;[a,b,c,d,e,f,g,j]=[(t1+t2)>>>0,a,b,c,(d+t1)>>>0,e,f,g];}
  [a,b,c,d,e,f,g,j].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
 }
 return h.map(v=>v.toString(16).padStart(8,'0')).join('');
}
function verification(value,kind){
 exact(value,'verification');enumValue(value.state,['verified','pending','conflict']);uniqueSorted(value.fields);
 require(value.fields.every(f=>VERIFY[kind].includes(f)));require((value.state==='verified')===(value.fields.length===0));
}
function version(value){
 text(value.text,true);temporal(value.published_at);enumValue(value.publication_basis,['verified','id_inferred','mirror_reported','unknown']);enumValue(value.text_completeness,['complete','unknown','unavailable']);
 require((value.published_at===null)===(value.publication_basis==='unknown'));require(value.text!==null||value.text_completeness==='unavailable');
 const fields=value.verification.fields;
 if(value.text===null)require(fields.includes('text'));
 if(value.text_completeness!=='complete')require(fields.includes('text_completeness'));
 if(value.published_at===null||value.publication_basis!=='verified')require(fields.includes('published_at'));
 require((value.verification.state==='conflict')===fields.includes('revision'));
}
export function validateCalendar(data){
 exact(data,'root');require(data.calendar_schema_version===1);timestamp(data.generated_at,{seconds:true});
 exact(data.checked_at_range,'range');const {min,max}=data.checked_at_range;
 timestamp(min,{nullable:true});timestamp(max,{nullable:true});require((min===null)===(max===null)&&(min===null||Date.parse(min)<=Date.parse(max)));
 exact(data.coverage,'coverage');const protocols=data.coverage.protocol_versions;
 require(Array.isArray(protocols)&&protocols.every(p=>Number.isInteger(p)&&(p===1||p===2))&&canonical(protocols)===canonical([...new Set(protocols)].sort()));
 uniqueSorted(data.coverage.notes);data.coverage.notes.forEach(n=>text(n));
 for(const key of ['events','sources','unlinked_sources'])require(Array.isArray(data[key]));
 const sourceIds=[];
 for(const source of data.sources){
  exact(source,'source');if(Object.hasOwn(source,'summary_zh')){text(source.summary_zh);require([...source.summary_zh].length<=1000&&!/\p{Cc}/u.test(source.summary_zh));}require(typeof source.id==='string'&&/^source-sha256:[0-9a-f]{64}$/.test(source.id));require(safeSourceURL(source.url));
  require(source.id==='source-sha256:'+sha256(sourceKey(source.url)));sourceIds.push(source.id);
  verification(source.verification,'source');version(source);require(Array.isArray(source.versions)&&source.versions.length>0);
  for(const v of source.versions){exact(v,'version');verification(v.verification,'version');version(v);}
  uniqueSorted(source.versions.map(canonical));
  if(source.verification.fields.includes('revision'))require(source.text===null&&source.published_at===null&&source.publication_basis==='unknown'&&source.text_completeness==='unavailable');
  else require(source.versions.some(v=>['text','published_at','publication_basis','text_completeness'].every(k=>canonical(v[k])===canonical(source[k]))));
 }
 uniqueSorted(sourceIds);require(Boolean(sourceIds.length)===Boolean(protocols.length));require(Boolean(sourceIds.length)===(min!==null));
 const eventIds=[],linked=new Set();
 for(const e of data.events){
  exact(e,'event');require(typeof e.id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(e.id));eventIds.push(e.id);
  enumValue(e.reset_kind,['forced','banked','unknown']);enumValue(e.status,['announced','confirmed','delayed','cancelled','unknown']);
  for(const field of ['executed_at','planned_at','previous_planned_at'])temporal(e[field]);text(e.eligibility_summary,true);
  uniqueSorted(e.source_ids);require(e.source_ids.every(id=>sourceIds.includes(id)));e.source_ids.forEach(id=>linked.add(id));verification(e.verification,'event');const fields=e.verification.fields;
  for(const f of ['reset_kind','status'])require((e[f]==='unknown')===fields.includes(f));
  for(const f of ['executed_at','planned_at','previous_planned_at','eligibility_summary'])require(e[f]===null||!fields.includes(f));
  if(!e.source_ids.length)require(fields.includes('association'));require(e.status==='confirmed'||e.executed_at===null);validDate(e.display_date);
  const target={confirmed:'executed_at',announced:'planned_at',cancelled:'previous_planned_at',delayed:e.planned_at!==null?'planned_at':'previous_planned_at'}[e.status];
  if(target){require(e[target]!==null||fields.includes(target)||(e.status==='delayed'&&fields.includes('planned_at')));const expected=e[target]===null?null:e[target].value.slice(0,10);require(e.display_date===expected&&e.display_basis===(expected?target:null));}
  else require(e.display_basis===(e.display_date?'source_stated':null));
 }
 uniqueSorted(eventIds);const unlinkedIds=[];
 for(const r of data.unlinked_sources){
  exact(r,'unlinked');text(r.source_id);unlinkedIds.push(r.source_id);require(sourceIds.includes(r.source_id)&&!linked.has(r.source_id));temporal(r.mentioned_at);validDate(r.display_date);require(r.display_basis==='mentioned');if(r.mentioned_at!==null)require(r.display_date===r.mentioned_at.value.slice(0,10));
 }
 uniqueSorted(unlinkedIds);require(canonical(unlinkedIds)===canonical(sourceIds.filter(id=>!linked.has(id))));scan(data);return data;
}
function countable(e){return e.status==='confirmed'&&e.executed_at!==null&&!['association','status','executed_at'].some(f=>e.verification.fields.includes(f));}
function pending(e){
 const fields=e.verification.fields;
 if(['association','reset_kind','status'].some(f=>fields.includes(f)))return true;
 const applicable={confirmed:['executed_at'],announced:['planned_at'],delayed:[e.planned_at!==null||fields.includes('planned_at')?'planned_at':'previous_planned_at'],cancelled:['previous_planned_at']}[e.status]||[];
 return applicable.some(f=>fields.includes(f));
}
export function calendarRecords(data){
 const byId=new Map(data.sources.map(s=>[s.id,s]));
 return [...data.events.map(e=>({type:'event',id:e.id,kind:e.reset_kind,status:e.status,date:e.display_date,basis:e.display_basis,countable:countable(e),pending:pending(e),event:e,sources:e.source_ids.map(id=>byId.get(id)),source_ids:e.source_ids})),...data.unlinked_sources.map(r=>({type:'source',id:'unlinked:'+r.source_id,kind:'unknown',status:'unknown',date:r.display_date,basis:'mentioned',countable:false,pending:true,mentioned_at:r.mentioned_at,sources:[byId.get(r.source_id)],source_ids:[r.source_id]}))];
}
export function monthStats(data,month){
 require(typeof month==='string'&&/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month));
 const records=calendarRecords(data),inMonth=records.filter(r=>r.date?.startsWith(month+'-')),confirmed=inMonth.filter(r=>r.countable);
 return {confirmed_resets:new Set(confirmed.map(r=>r.id)).size,confirmed_dates:new Set(confirmed.map(r=>r.date)).size,associated_sources:new Set(inMonth.flatMap(r=>r.source_ids)).size,unlinked_sources:data.unlinked_sources.length,pending_events:records.filter(r=>r.type==='event'&&r.pending).length};
}
// Publication is a separate information layer, never an execution-date fallback.
export function announcementRecords(data){
 return data.sources.filter(s=>s.published_at!==null).map(s=>({
  type:'announcement',id:'announcement:'+s.id,kind:'unknown',status:'unknown',
  date:s.published_at.value.slice(0,10),basis:'published_at',countable:false,pending:false,
  sources:[s],source_ids:[s.id],related_events:data.events.filter(e=>e.source_ids.includes(s.id)),
 }));
}
export function browseRecords(data){return [...calendarRecords(data),...announcementRecords(data)];}
export function initialBrowseDate(data,today){
 validDate(today,false);
 const dates=[...new Set(browseRecords(data).map(r=>r.date).filter(Boolean))].sort();
 return dates.filter(d=>d<=today).at(-1)??dates[0]??today;
}
export function filterRecords(records,{kind='all',status='all'}={}){
 const matches=(k,s)=>(kind==='all'||k===kind)&&(status==='all'||s===status);
 return records.filter(r=>r.type==='announcement'&&r.related_events.length?r.related_events.some(e=>matches(e.reset_kind,e.status)):matches(r.kind,r.status));
}
export function dayDetails(data,date,filters={}){validDate(date,false);return filterRecords(browseRecords(data),filters).filter(r=>r.date===date);}
// JSON.parse 会静默接受重复键；加载入口先用严格递归解析拒绝重复键和非有限数。
export function parseCalendarJSON(input){
 require(typeof input==='string');let pos=0;
 const ws=()=>{while(/[\t\n\r ]/.test(input[pos]||'x'))pos++;};
 function value(){
  ws();const c=input[pos];
  if(c==='"'){const start=pos++;while(pos<input.length){if(input[pos]==='\\'){pos+=2;continue;}if(input[pos++]==='"')return JSON.parse(input.slice(start,pos));}fail();}
  if(c==='{'||c==='['){const object=c==='{',out=object?Object.create(null):[],keys=new Set();pos++;ws();if(input[pos]===(object?'}':']')){pos++;return out;}
   while(true){if(object){require(input[pos]==='"');const key=value();require(!keys.has(key));keys.add(key);ws();require(input[pos++]===':');out[key]=value();}else out.push(value());ws();const delimiter=input[pos++];if(delimiter===(object?'}':']'))return out;require(delimiter===',');ws();}
  }
  const token=/^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(input.slice(pos));require(token);pos+=token[0].length;const result=JSON.parse(token[0]);require(typeof result!=='number'||Number.isFinite(result));return result;
 }
 value();ws();require(pos===input.length);return JSON.parse(input);
}

// Curated public challenge snapshot. Mail payloads never populate this contract.
export const CHALLENGE_FALLBACK = {"schema_version":1,"updated_at":"2026-10-16T08:33:00.000Z","pledge_url":"https://x.com/thsottiaux/status/2106845241357824205","days":[{"day":1,"title_zh":"默认推理提速","summary_zh":"订阅内 GPT-6 Astra 与 GPT-6.1 Sol 默认速度提升约 50%。","improvements":[{"text_zh":"适用于自家产品及支持 ChatGPT 登录的合作产品，无需用户调整。","source_urls":["https://x.com/thsottiaux/status/2107158998495748264"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2107158998495748264","published_at":"2026-10-05T17:20:29.000Z","time_basis":"mirror_reported","role":"announcement"}],"reset":null},{"day":2,"title_zh":"四项改进 + 重置","summary_zh":"自动审核免耗额度、API 简化、会议笔记及 Decisions API 上线后，另完成一次重置。","improvements":[{"text_zh":"Approve for me 自动审核不再消耗套餐用量。","source_urls":["https://x.com/thsottiaux/status/2107575657014468879"]},{"text_zh":"面向开发者的 API 简化。","source_urls":["https://x.com/thsottiaux/status/2107575657014468879"]},{"text_zh":"集成会议笔记。","source_urls":["https://x.com/thsottiaux/status/2107575657014468879"]},{"text_zh":"Decisions API 向开发者开放。","source_urls":["https://x.com/thsottiaux/status/2107575657014468879"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2107575657014468879","published_at":"2026-10-06T20:56:08.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2107578625419866469","published_at":"2026-10-06T21:07:55.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2107676072871600470","published_at":"2026-10-07T03:35:09.000Z","time_basis":"mirror_reported","role":"completion"},{"url":"https://x.com/thsottiaux/status/2107676261099426030","published_at":"2026-10-07T03:35:54.000Z","time_basis":"mirror_reported","role":"announcement"}],"reset":{"kind":"usage_reset","status":"completed","completion_source_url":"https://x.com/thsottiaux/status/2107676072871600470","executed_at":null,"execution_source_url":null}},{"day":3,"title_zh":"GPT-6 Chat、Cloud 与预存重置","summary_zh":"GPT-6 进入 Chat，Codex Cloud 重新上线，并为付费账户发放一次预存重置。","improvements":[{"text_zh":"GPT-6 进入 Chat。","source_urls":["https://x.com/thsottiaux/status/2107913674593644711"]},{"text_zh":"Day 3 返场：重新上线 Codex Cloud。","source_urls":["https://x.com/thsottiaux/status/2108084615349170480"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2107913674593644711","published_at":"2026-10-07T19:19:17.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2107913738791596286","published_at":"2026-10-07T19:19:33.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2108040921044639779","published_at":"2026-10-08T03:44:55.000Z","time_basis":"mirror_reported","role":"completion"},{"url":"https://x.com/thsottiaux/status/2108084615349170480","published_at":"2026-10-08T06:38:33.274Z","time_basis":"id_inferred","role":"announcement"}],"reset":{"kind":"banked_reset_grant","status":"completed","completion_source_url":"https://x.com/thsottiaux/status/2108040921044639779","executed_at":null,"execution_source_url":null}},{"day":4,"title_zh":"即时转向与 Ultrafast","summary_zh":"中途修改指令可更快生效，同时发布 GPT-6.1 Sol Ultrafast。","improvements":[{"text_zh":"改进 steering，让模型即时响应任务中的方向调整。","source_urls":["https://x.com/thsottiaux/status/2108275041276420573"]},{"text_zh":"发布 GPT-6.1 Sol Ultrafast。","source_urls":["https://x.com/thsottiaux/status/2108275041276420573"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2108275041276420573","published_at":"2026-10-08T19:15:14.353Z","time_basis":"id_inferred","role":"announcement"}],"reset":null},{"day":5,"title_zh":"输入预测与移动端 dot","summary_zh":"桌面端新增下一条消息预测，手机端可直接创建并联系 dot。","improvements":[{"text_zh":"Composer predictions 纳入 Pro，预测本身不消耗用量。","source_urls":["https://x.com/thsottiaux/status/2108645667451318747"]},{"text_zh":"可完全通过 ChatGPT 手机应用创建并向 dot 发消息。","source_urls":["https://x.com/thsottiaux/status/2108646052178092403"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2108645667451318747","published_at":"2026-10-09T19:47:58.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2108646052178092403","published_at":"2026-10-09T19:49:30.245Z","time_basis":"id_inferred","role":"announcement"}],"reset":null},{"day":6,"title_zh":"全局重置","summary_zh":"公布全局重置，随后确认已全部传播。","improvements":[],"sources":[{"url":"https://x.com/thsottiaux/status/2109045220411351517","published_at":"2026-10-10T22:15:39.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2109045392684032299","published_at":"2026-10-10T22:16:20.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2109132167112782291","published_at":"2026-10-11T04:01:09.000Z","time_basis":"mirror_reported","role":"completion"}],"reset":{"kind":"global_reset","status":"completed","completion_source_url":"https://x.com/thsottiaux/status/2109132167112782291","executed_at":null,"execution_source_url":null}},{"day":7,"title_zh":"默认上下文 500k","summary_zh":"Codex 与 Work 的 Sol 默认上下文从 272k 扩至 500k，订阅用量不另收长上下文费用。","improvements":[{"text_zh":"GPT-6.1 Sol 默认上下文扩容，可自行调整，上限仍为 1M。","source_urls":["https://x.com/thsottiaux/status/2109430343346581527"]},{"text_zh":"从订阅用量扣除时，不收该模型长上下文附加费用。","source_urls":["https://x.com/thsottiaux/status/2109430894604026039"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2109430343346581527","published_at":"2026-10-11T23:45:59.831Z","time_basis":"id_inferred","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2109430894604026039","published_at":"2026-10-11T23:48:11.000Z","time_basis":"mirror_reported","role":"announcement"}],"reset":null},{"day":8,"title_zh":"全局重置","summary_zh":"公布全局重置，后续帖子确认完成。","improvements":[],"sources":[{"url":"https://x.com/thsottiaux/status/2109812216212099456","published_at":"2026-10-13T01:03:25.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2109812360596865224","published_at":"2026-10-13T01:03:59.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2109873287853707513","published_at":"2026-10-13T05:06:06.000Z","time_basis":"mirror_reported","role":"completion"}],"reset":{"kind":"global_reset","status":"completed","completion_source_url":"https://x.com/thsottiaux/status/2109873287853707513","executed_at":null,"execution_source_url":null}},{"day":9,"title_zh":"减少本地状态占用","summary_zh":"优化 ChatGPT 与 Codex 桌面应用的状态存储，预计减少约 60% 的状态数据磁盘占用。","improvements":[{"text_zh":"优化的是本地状态数据，不代表整个应用或电脑占用减少 60%。","source_urls":["https://x.com/thsottiaux/status/2110151780478927344"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2110151780478927344","published_at":"2026-10-13T23:32:43.847Z","time_basis":"id_inferred","role":"announcement"}],"reset":null},{"day":10,"title_zh":"重置完成","summary_zh":"预告两小时内重置后，另发帖确认完成。","improvements":[],"sources":[{"url":"https://x.com/thsottiaux/status/2110595484180214059","published_at":"2026-10-15T04:55:51.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2110595554036400151","published_at":"2026-10-15T04:56:07.000Z","time_basis":"mirror_reported","role":"announcement"},{"url":"https://x.com/thsottiaux/status/2110618732666257557","published_at":"2026-10-15T06:28:13.000Z","time_basis":"mirror_reported","role":"completion"}],"reset":{"kind":"usage_reset","status":"completed","completion_source_url":"https://x.com/thsottiaux/status/2110618732666257557","executed_at":null,"execution_source_url":null}},{"day":11,"title_zh":"降低满载中断","summary_zh":"增加算力并优化服务，减少模型满载报错，遇到时应能自动继续。","improvements":[{"text_zh":"减少 Selected model is at capacity 错误，并使遇到该情况的任务最终自动继续。","source_urls":["https://x.com/thsottiaux/status/2110750421367287996"]}],"sources":[{"url":"https://x.com/thsottiaux/status/2110750421367287996","published_at":"2026-10-15T15:11:30.000Z","time_basis":"mirror_reported","role":"announcement"}],"reset":null}]};
const CHALLENGE_URL='https://raw.githubusercontent.com/skommando/reset-notice-page/refs/heads/challenge-data/data/challenge.json';
function challengeKeys(value,keys){require(value!==null&&typeof value==='object'&&!Array.isArray(value));require(canonical(Object.keys(value).sort())===canonical(keys.sort()));}
function challengeTime(value){
 require(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
 validDate(value.slice(0,10),false);require(Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value);return Date.parse(value);
}
function challengeURL(value){require(typeof value==='string'&&/^https:\/\/x\.com\/thsottiaux\/status\/[1-9][0-9]{0,24}$/.test(value));}
function challengeText(value,max=400){text(value);scan(value);require([...value].length<=max&&!/[<>\u0000-\u001f\u007f-\u009f]/u.test(value)&&!SENSITIVE.some(p=>p.test(value)));}
export function validateChallenge(data){
 challengeKeys(data,['schema_version','updated_at','pledge_url','days']);require(data.schema_version===1||data.schema_version===2);
 const updated=challengeTime(data.updated_at);challengeURL(data.pledge_url);
 require(Array.isArray(data.days)&&data.days.length<=28);let previous=0;const allSources=new Set();
 for(const day of data.days){
  challengeKeys(day,['day','title_zh','summary_zh','improvements','sources','reset']);
  require(Number.isInteger(day.day)&&day.day>previous&&day.day<=28);previous=day.day;
  challengeText(day.title_zh,100);challengeText(day.summary_zh);require(/[\u3400-\u9fff]/u.test(day.summary_zh));
  require(Array.isArray(day.sources)&&day.sources.length>0&&day.sources.length<=16);
  const sources=new Map();
  for(const source of day.sources){
   challengeKeys(source,['url','published_at','time_basis','role']);challengeURL(source.url);
   require(!allSources.has(source.url));allSources.add(source.url);
   require(challengeTime(source.published_at)<=updated);enumValue(source.time_basis,['mirror_reported','id_inferred','verified']);enumValue(source.role,['announcement','completion','execution']);sources.set(source.url,source);
  }
  require(Array.isArray(day.improvements)&&day.improvements.length<=12);
  for(const item of day.improvements){challengeKeys(item,['text_zh','source_urls']);challengeText(item.text_zh);require(Array.isArray(item.source_urls)&&item.source_urls.length>0&&new Set(item.source_urls).size===item.source_urls.length&&item.source_urls.every(url=>sources.has(url)));}
  if(day.reset!==null){
   const r=day.reset;challengeKeys(r,['kind','status','completion_source_url','executed_at','execution_source_url',...(data.schema_version===2?['planned_deadline_at','planned_deadline_source_url']:[])]);
   if(data.schema_version===2){
    if(r.planned_deadline_at===null)require(r.planned_deadline_source_url===null);
    else {
     const planned=sources.get(r.planned_deadline_source_url);require(planned?.role==='announcement');
     require(challengeTime(r.planned_deadline_at)>=Date.parse(planned.published_at));
    }
   }
   enumValue(r.kind,['usage_reset','global_reset','banked_reset_grant']);enumValue(r.status,['announced','completed']);
   if(r.status==='announced')require(r.completion_source_url===null&&r.executed_at===null&&r.execution_source_url===null);
   else {
    const completion=sources.get(r.completion_source_url);require(completion?.role==='completion');
    if(r.executed_at===null)require(r.execution_source_url===null);
    else {require(challengeTime(r.executed_at)<=Date.parse(completion.published_at));require(sources.has(r.execution_source_url));}
   }
  }
 }
 return data;
}
// Presentation only: preserve the ascending public data contract.
export function challengeDayOrder(data){
 const published=new Set(data.days.map(day=>day.day));
 const upcoming=Array.from({length:28},(_,i)=>i+1).filter(number=>!published.has(number));
 return [...published].sort((a,b)=>b-a).concat(upcoming);
}
export function latestReset(data){
 // Select the newest completed identity first; only then prefer its execution evidence.
 const completed=data.days.filter(d=>d.reset?.status==='completed'&&d.reset.kind!=='banked_reset_grant').map(d=>({day:d.day,reset:d.reset,source:d.sources.find(s=>s.url===d.reset.completion_source_url)}));
 completed.sort((a,b)=>Date.parse(b.source.published_at)-Date.parse(a.source.published_at)||b.day-a.day);
 const event=completed[0];if(!event)return null;
 return {day:event.day,at:event.reset.executed_at??event.source.published_at,basis:event.reset.executed_at?'executed':'completion_post',url:event.reset.executed_at?event.reset.execution_source_url:event.source.url};
}
export function elapsedHours(anchor,now=Date.now()){
 if(!anchor)return null;const delta=now-Date.parse(anchor.at);return Number.isFinite(delta)&&delta>=0?(delta/3600000).toFixed(1):null;
}
export async function loadChallenge(fetcher=globalThis.fetch,{timeoutMs=6000}={}){
 const fallback=validateChallenge(CHALLENGE_FALLBACK),controller=new AbortController();let timer;
 try{
  const remote=await Promise.race([
   (async()=>{const response=await fetcher(CHALLENGE_URL,{cache:'no-cache',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal});require(response.ok);const input=await response.text();require(input.length<=200000);return validateChallenge(parseCalendarJSON(input));})(),
   new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('challenge_timeout'));},timeoutMs);})
  ]);
  require(Date.parse(remote.updated_at)>=Date.parse(fallback.updated_at)&&Date.parse(remote.updated_at)<=Date.now()+60000);
  return {data:remote,fallback:false};
 }catch{return {data:fallback,fallback:true};}
 finally{clearTimeout(timer);}
}


// Derived read model: data updates change the anchor; wall-clock ticks change hours.
// Never persist a duration or reinterpret an announcement as execution evidence.
// User-approved estimate lives in the frontend, outside the hourly evidence feed.
// The linked post identifies the round; it does not confirm this estimated time.
const MANUAL_RESET_ESTIMATE=Object.freeze({day:21,at:'2026-10-26T06:08:00.000Z',basis:'manual_estimate',url:'https://x.com/thsottiaux/status/2114588174249071102'});
export function challengeResetView(data,now=Date.now()){
 validateChallenge(data);
 let anchor=latestReset(data);
 // Explicit schedule bounds are estimates, never completed facts. A newer round
 // may replace an older completion only once its sourced deadline has passed.
 const inferred=data.days.filter(d=>d.reset?.status==='announced'&&d.reset.kind!=='banked_reset_grant'&&d.reset.planned_deadline_at!=null&&Date.parse(d.reset.planned_deadline_at)<=now).at(-1);
 if(inferred&&(!anchor||inferred.day>anchor.day))anchor={day:inferred.day,at:inferred.reset.planned_deadline_at,basis:'announcement_deadline',url:inferred.reset.planned_deadline_source_url};
 const manual=MANUAL_RESET_ESTIMATE,round=data.days.find(d=>d.day===manual.day);
 const matchesRound=round?round.reset?.status==='announced'&&round.reset.kind!=='banked_reset_grant'&&round.sources.some(s=>s.url===manual.url&&s.role==='announcement'&&Date.parse(s.published_at)<=Date.parse(manual.at)):data.days.every(d=>d.day<manual.day);
 const superseded=data.days.some(d=>d.day>=manual.day&&d.reset?.status==='completed'&&d.reset.kind!=='banked_reset_grant');
 if(data.pledge_url===CHALLENGE_FALLBACK.pledge_url&&matchesRound&&!superseded&&Date.parse(manual.at)<=now&&(!anchor||anchor.day<manual.day))anchor=manual;
 const pending=data.days.filter(d=>d.reset?.status==='announced'&&d.reset.kind!=='banked_reset_grant'&&(!anchor||d.day>anchor.day||anchor.basis==='manual_estimate'&&d.day===anchor.day)).at(-1)??null;
 return {anchor,hours:elapsedHours(anchor,now),pending};
}
export function createChallengeRefresh({initial=CHALLENGE_FALLBACK,load=loadChallenge,onChange=()=>{}}={}){
 let current={data:validateChallenge(initial),fallback:true,stale:false},inFlight=null;
 function refresh(){
  if(inFlight)return inFlight;
  // Start the load synchronously, but always release the guard after settlement.
  let request;try{request=load();}catch{request=Promise.reject(new Error('challenge_unavailable'));}
  inFlight=Promise.resolve(request).then(result=>{
   const data=validateChallenge(result.data);
   if(result.fallback||Date.parse(data.updated_at)<Date.parse(current.data.updated_at)||Date.parse(data.updated_at)>Date.now()+60000){current={...current,stale:true};}
   else current={data,fallback:false,stale:false};
  }).catch(()=>{current={...current,stale:true};}).then(()=>{onChange(current);return current;}).finally(()=>{inFlight=null;});
  return inFlight;
 }
 return {refresh};
}
