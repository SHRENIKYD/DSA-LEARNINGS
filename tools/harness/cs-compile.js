// Compiles and runs C# for tools/solution-check.js and tools/validate.js.
// Prefers Mono (`mcs` + `mono`, C# 7.3); otherwise uses the .NET SDK (`dotnet`, LangVersion 7.3, net8.0) through one
// cached console project per process. Returns null from compile() when neither toolchain is installed.
// The C# course (content/csharp) teaches modern C#: compile(..., { modern: true }) always uses the .NET SDK with
// LangVersion 12 on net8.0, implicit usings and nullable annotations (warnings never fail a build). It returns null
// when dotnet is not installed, even if Mono is.
//   compile(dir, source, { exe, main, timeout }) -> { ok, err, run(stdin, ms) }
//     exe: true builds a program (false: a library, compile-check only); main: the startup class when the source has
//     more than one Main; run() executes the built program with the given stdin and millisecond limit.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

let tool;
function hasDotnet() {
  if (hasDotnet.v === undefined) { const r = spawnSync('dotnet', ['--version'], { encoding: 'utf8', timeout: 60000 }); hasDotnet.v = !r.error && r.status === 0; }
  return hasDotnet.v;
}
function toolchain() {
  if (tool !== undefined) return tool;
  const has = (cmd, argv) => { const r = spawnSync(cmd, argv, { encoding: 'utf8', timeout: 60000 }); return !r.error && r.status === 0; };
  if (has('mcs', ['--version']) && has('mono', ['--version'])) tool = 'mono';
  else if (has('dotnet', ['--version'])) tool = 'dotnet';
  else tool = null;
  return tool;
}
const ENV = Object.assign({}, process.env, { DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', DOTNET_CLI_UI_LANGUAGE: 'en' });
const proj = {};
function dotnetProject(modern) {
  const key = modern ? 'modern' : 'legacy';
  if (proj[key]) return proj[key];
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'imastery-cs-'));
  fs.writeFileSync(path.join(d, 'cs.csproj'), [
    '<Project Sdk="Microsoft.NET.Sdk">',
    '  <PropertyGroup>',
    '    <OutputType>Exe</OutputType>',
    '    <TargetFramework>net8.0</TargetFramework>',
    modern ? '    <LangVersion>12</LangVersion>' : '    <LangVersion>7.3</LangVersion>',
    modern ? '    <Nullable>enable</Nullable>' : '    <Nullable>disable</Nullable>',
    modern ? '    <ImplicitUsings>enable</ImplicitUsings>' : '    <ImplicitUsings>disable</ImplicitUsings>',
    '    <UseAppHost>false</UseAppHost>',
    '    <AssemblyName>cs</AssemblyName>',
    '    <RootNamespace>cs</RootNamespace>',
    '    <WarningLevel>0</WarningLevel>',
    '    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>',
    '    <EnableDefaultCompileItems>false</EnableDefaultCompileItems>',
    '    <GenerateAssemblyInfo>false</GenerateAssemblyInfo>',
    '    <SatelliteResourceLanguages>en</SatelliteResourceLanguages>',
    '  </PropertyGroup>',
    '  <ItemGroup>',
    '    <Compile Include="$(SnipFile)" Condition="\'$(SnipFile)\' != \'\'" />',
    '  </ItemGroup>',
    '</Project>', ''].join('\n'));
  const r = spawnSync('dotnet', ['restore', 'cs.csproj', '-nologo', '-v', 'q'], { cwd: d, encoding: 'utf8', env: ENV, timeout: 300000 });
  if (r.status !== 0) throw new Error('dotnet restore failed: ' + String(r.stderr || r.stdout).slice(0, 800));
  process.on('exit', () => fs.rmSync(d, { recursive: true, force: true }));
  return (proj[key] = d);
}
function compile(dir, source, o) {
  o = o || {};
  const kind = o.modern ? (hasDotnet() ? 'dotnet' : null) : toolchain();
  if (!kind) return null;
  const ms = o.timeout || 180000;
  fs.mkdirSync(dir, { recursive: true });
  const src = path.join(dir, 'main.cs');
  fs.writeFileSync(src, source);
  if (kind === 'mono') {
    const out = path.join(dir, o.exe === false ? 'main.dll' : 'main.exe');
    const argv = ['-nologo', '-warn:0', '-codepage:utf8', '-r:System.Numerics.dll', '-target:' + (o.exe === false ? 'library' : 'exe'), '-out:' + out];
    if (o.main && o.exe !== false) argv.push('-main:' + o.main);
    argv.push(src);
    const c = spawnSync('mcs', argv, { cwd: dir, encoding: 'utf8', timeout: ms, maxBuffer: 16 << 20 });
    if (c.error || c.status !== 0) return { ok: false, err: (c.error && c.error.code === 'ETIMEDOUT' ? 'mcs timed out' : String(c.stdout || '') + String(c.stderr || '')).replace(/\/[^\s:]*\/main\.cs/g, 'main.cs').trim() };
    return { ok: true, run: (stdin, rms) => spawnSync('mono', [out], { cwd: dir, encoding: 'utf8', input: stdin || '', timeout: rms || 20000, maxBuffer: 16 << 20 }) };
  }
  let p;
  try { p = dotnetProject(!!o.modern); } catch (e) { return { ok: false, err: e.message }; }
  const out = path.join(dir, 'out');
  const argv = ['build', 'cs.csproj', '--no-restore', '-c', 'Release', '-nologo', '-v', 'q', '-clp:NoSummary', '-o', out, '-p:SnipFile=' + src, '-p:OutputType=' + (o.exe === false ? 'Library' : 'Exe')];
  if (o.main && o.exe !== false) argv.push('-p:StartupObject=' + o.main);
  const c = spawnSync('dotnet', argv, { cwd: p, encoding: 'utf8', env: ENV, timeout: ms, maxBuffer: 16 << 20 });
  if (c.error || c.status !== 0) {
    const all = (String(c.stdout || '') + String(c.stderr || '')).split('\n'), errs = all.filter((l) => /\berror\b/i.test(l));
    const msg = c.error && c.error.code === 'ETIMEDOUT' ? 'dotnet build timed out' : (errs.length ? errs : all).join('\n');
    return { ok: false, err: msg.replace(/\/[^\s:(]*\/main\.cs/g, 'main.cs').replace(/\s*\[[^\]]*cs\.csproj\]/g, '').trim() };
  }
  return { ok: true, run: (stdin, rms) => spawnSync('dotnet', [path.join(out, 'cs.dll')], { cwd: dir, encoding: 'utf8', env: ENV, input: stdin || '', timeout: rms || 20000, maxBuffer: 16 << 20 }) };
}
module.exports = { toolchain, hasDotnet, compile };
