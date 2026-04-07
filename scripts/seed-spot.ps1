# 用 UTF-8 请求体写入一条中文测试点位（避免控制台编码把中文弄成 ???）
# 用法: .\scripts\seed-spot.ps1
# 请用 UTF-8（建议带 BOM）保存本脚本。

param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

# 直接写 JSON 字符串，依赖脚本文件为 UTF-8 编码
$json = @'
{"name":"测试小店","address":"陆家嘴环路","lat":31.2397,"lng":121.4998,"createdBy":"dev-1"}
'@

Invoke-RestMethod `
  -Method POST `
  -Uri "$BaseUrl/api/spots" `
  -ContentType "application/json; charset=utf-8" `
  -Body $json

Write-Host "OK: 已写入一条中文测试点位，请刷新地图页面。"
