const fs = require('fs-extra');

const express = require('express');
const line = require('@line/bot-sdk');
const config = require('./line');

const path = require('path');
// const gifGenerator = require('./gifGenerator');
const mp3Generator = require('./mp3Generator');

const app = express();
app.use(express.static(path.resolve('./public')));

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => {
      res.json(result)
    }).catch(err => {
      console.log(err);
    });
});

const client = new line.Client(config);
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }
  // const fileName = await gifGenerator(['a', 'b', 'c'])

  let errorText = '';
  const text = event.message.text;
  if (text.length > 200) {
    errorText = '文字が長すぎます！';
  }

  const candidates = text.split(/\s/);

  if (candidates.length > 5) {
    errorText = 'ごめんなさい！最大5個でお願いします！';
  }
  if (candidates.length < 1) {
    errorText = '選択肢をスペースで区切ってください！';
  }

  const fileName = await mp3Generator(candidates);

  if (!fileName) {
    errorText = 'ごめんなさい...画像生成中に死んだっぽい。'
  }

  if (errorText) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: errorText
    });
  }
  return client.replyMessage(event.replyToken, {
    type: 'video',
    originalContentUrl: config.staticServer + fileName,
    previewImageUrl: config.staticServer + fileName + '.png'
  });
}

// cleaner
fs.emptyDirSync('./tmp');
fs.writeFileSync('./tmp/.keep');

app.listen(3000);