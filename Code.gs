// 全球動力科技 設備通報系統 — Google Apps Script 後端
// 最後更新: 2026/03/19

var SPREADSHEET_ID = '1sRHhSsVlvYMS5X0HOQkOk1nbmcn_CHESh60WIBK3HV8';
var SHEET_INVENTORY = '庫存狀態';
var SHEET_REPORT = '維修通報';

/**
 * 處理 GET 請求：查詢設備資訊，回傳 HTML 頁面
 */
function doGet(e) {
  var sn = e.parameter.sn || '';
  var deviceInfo = lookupDevice(sn);

  var template = HtmlService.createTemplateFromFile('index');
  template.sn = sn;
  template.deviceInfo = JSON.stringify(deviceInfo);

  return template.evaluate()
    .setTitle('全球動力科技 設備通報系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 維修通報（由前端 google.script.run 呼叫）
 */
function submitReport(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_REPORT);

  sheet.appendRow([
    new Date(),            // 通報時間
    data.sn,               // SN
    data.bluetoothName,    // 藍芽名稱
    data.urgency,          // 緊急程度
    data.issue,            // 問題項目
    data.description,      // 補充描述
    data.reporter          // 通報人
  ]);

  // 寄 Gmail 通知
  var adminEmail = Session.getActiveUser().getEmail();
  var urgencyTag = data.urgency === '緊急' ? '[緊急] ' : '';
  var subject = urgencyTag + '設備通報 — ' + data.bluetoothName + ' (' + data.sn + ')';

  var body = [
    '全球動力科技 設備維修通報',
    '══════════════════════',
    '',
    '藍芽名稱：' + data.bluetoothName,
    'SN：' + data.sn,
    '緊急程度：' + data.urgency,
    '問題項目：' + data.issue,
    '補充描述：' + (data.description || '無'),
    '通報人：' + data.reporter,
    '通報時間：' + new Date().toLocaleString('zh-TW'),
    '',
    '══════════════════════',
    '此通知由全球動力科技設備通報系統自動發送'
  ].join('\n');

  GmailApp.sendEmail(adminEmail, subject, body);

  return { status: 'success' };
}

/**
 * 更新設備狀態 / 存放位置（由前端 google.script.run 呼叫）
 */
function updateDevice(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_INVENTORY);
  var values = sheet.getDataRange().getValues();

  // 欄位順序：SN(0), 貼紙編號(1), 藍芽名稱(2), 使用槍枝(3), 狀態(4), 存放位置(5), 備註(6)
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(data.sn).trim()) {
      var row = i + 1;

      if (data.newStatus) {
        sheet.getRange(row, 5).setValue(data.newStatus);
      }
      if (data.newLocation) {
        sheet.getRange(row, 6).setValue(data.newLocation);
      }

      return { status: 'success' };
    }
  }

  throw new Error('找不到 SN: ' + data.sn);
}

/**
 * 查詢庫存狀態試算表，用 SN 找出設備資訊
 */
function lookupDevice(sn) {
  if (!sn) return null;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_INVENTORY);
  var data = sheet.getDataRange().getValues();

  // 欄位順序：SN, 貼紙編號, 藍芽名稱, 使用槍枝, 狀態, 存放位置, 備註
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(sn).trim()) {
      return {
        sn: data[i][0],
        stickerNo: data[i][1],
        bluetoothName: data[i][2],
        gun: data[i][3],
        status: data[i][4],
        location: data[i][5],
        note: data[i][6]
      };
    }
  }

  return null;
}
