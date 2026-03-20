// 全球動力科技 設備通報系統 — Google Apps Script 後端
// 最後更新: 2026/03/20

var SPREADSHEET_ID = '1sRHhSsVlvYMS5X0HOQkOk1nbmcn_CHESh60WIBK3HV8';
var SHEET_INVENTORY = '庫存狀態';
var SHEET_REPORT = '維修通報';
var PHOTO_FOLDER_NAME = '設備通報照片';

/**
 * 授權測試用 — 執行一次就可以刪掉
 * 這個函式會觸發 Drive 和 Gmail 的權限授權
 */
function authorizeDrive() {
  var folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  if (folders.hasNext()) {
    Logger.log('資料夾已存在：' + folders.next().getName());
  } else {
    var folder = DriveApp.createFolder(PHOTO_FOLDER_NAME);
    Logger.log('已建立資料夾：' + folder.getName());
  }
  Logger.log('Drive 授權成功！');
}

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

  // 處理照片上傳
  var photoUrl = '';
  if (data.photoData) {
    photoUrl = uploadPhoto(data.sn, data.photoData, data.photoName);
  }

  // 找到最後一筆有資料的列，避免跳到空白列
  var lastRow = sheet.getLastRow();
  var newRow = lastRow + 1;

  var rowData = [
    new Date(),            // 通報時間
    data.sn,               // SN
    data.bluetoothName,    // 藍芽名稱
    data.urgency,          // 緊急程度
    data.issue,            // 問題項目
    data.description,      // 補充描述
    data.reporter          // 通報人
  ];

  sheet.getRange(newRow, 1, 1, rowData.length).setValues([rowData]);

  // 照片連結寫成可點擊的超連結
  if (photoUrl) {
    var cell = sheet.getRange(newRow, 8);
    var richText = SpreadsheetApp.newRichTextValue()
      .setText('查看照片')
      .setLinkUrl(photoUrl)
      .build();
    cell.setRichTextValue(richText);
  }

  // 寄 Gmail 通知
  var adminEmail = 'jacky.lin@gptt.com.tw,syay.shih@gptt.com.tw,yijie.lee@gptt.com.tw,addy.li@gptt.com.tw,peter@gptt.com.tw,kai@gptt.com.tw,milu.tsai@gptt.com.tw';
  var urgencyTag = data.urgency === '緊急' ? '[緊急] ' : '';
  var subject = urgencyTag + '設備故障通報_(sn:' + data.sn + ')';

  var bodyParts = [
    '全球動力科技 設備維修通報',
    '══════════════════════',
    '',
    '藍芽名稱：' + data.bluetoothName,
    'SN：' + data.sn,
    '緊急程度：' + data.urgency,
    '問題項目：' + data.issue,
    '補充描述：' + (data.description || '無'),
    '通報人：' + data.reporter,
    '通報時間：' + new Date().toLocaleString('zh-TW')
  ];

  if (photoUrl) {
    bodyParts.push('照片：' + photoUrl);
  }

  bodyParts.push('');
  bodyParts.push('══════════════════════');
  bodyParts.push('此通知由全球動力科技設備通報系統自動發送');

  GmailApp.sendEmail(adminEmail, subject, bodyParts.join('\n'));

  return { status: 'success' };
}

/**
 * 上傳照片到 Google Drive 指定資料夾
 */
function uploadPhoto(sn, base64Data, fileName) {
  // 取得或建立資料夾
  var folders = DriveApp.getFoldersByName(PHOTO_FOLDER_NAME);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(PHOTO_FOLDER_NAME);
  }

  // 解析 base64 資料
  var contentType = base64Data.split(';')[0].split(':')[1];
  var base64 = base64Data.split(',')[1];
  var decoded = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(decoded, contentType);

  // 檔名格式：2026-03-19_14:44(sn:01000011001).jpg
  var ext = fileName.split('.').pop() || 'jpg';
  var dateStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd_HH:mm');
  var newFileName = dateStr + '(sn:' + sn + ').' + ext;
  blob.setName(newFileName);

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
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
