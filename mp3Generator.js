const path = require('path');
const fs = require('fs-extra');
const GIFEncoder = require('gifencoder');
const ffmpeg = require('fluent-ffmpeg');
const Canvas = require('canvas');
const easing = require('easingjs');

const EXPORT_PATH = './public';

const PANEL_COLORS = [
  {
    bg: '#de9610',
    text: '#ffffff'
  }, {
    bg: '#c93a40',
    text: '#ffffff'
  }, {
    bg: '#d06d8c',
    text: '#ffffff'
  }, {
    bg: '#65ace4',
    text: '#ffffff'
  }, {
    bg: '#a0c238',
    text: '#ffffff'
  }, {
    bg: '#56a764',
    text: '#ffffff'
  }, {
    bg: '#d16b16',
    text: '#ffffff'
  }, {
    bg: '#9460a0',
    text: '#ffffff'
  }, {
    bg: '#0074bf',
    text: '#ffffff'
  }
];

function createRoulettePanel(candidates, size, frameCount) {
  const canvas = new Canvas(size, size);
  const ctx = canvas.getContext('2d');
  const len = candidates.length;
  const deg = 360 / len;
  const rad = deg * Math.PI / 180;
  const base = deg * 0.5 * Math.PI / 180;
  const r = size * 0.5 * 0.875;
  const fontSize = 14;

  ctx.translate(size * 0.5, size * 0.5);
  candidates.forEach((condidate, i) => {
    const x = Math.cos(base - rad * 0.5) * 20;
    const y = Math.sin(base - rad * 0.5) * 20 + fontSize * 0.5;
    ctx.fillStyle = PANEL_COLORS[i % PANEL_COLORS.length].bg;
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, base - rad, base);
    ctx.stroke();
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PANEL_COLORS[i % PANEL_COLORS.length].text;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.fillText(condidate.slice(0, 10), x, y);
    ctx.rotate(rad);
  });

  const perDeg = 15;
  const aniDeg = perDeg * frameCount + Math.round(Math.random() * 360);
  const index = Math.floor((360 - (aniDeg - deg * 0.5) % 360) / deg);
  return { canvas, deg: aniDeg, candidate: candidates[index] };
}

function createVideo(candidates) {
  return new Promise((resolve, reject) => {
    try {
      const encoder = new GIFEncoder(240, 240);
      const fileName = `${Date.now().toString(16)}.mp4`;
      const filePath = path.resolve(EXPORT_PATH, fileName);

      let canvas = new Canvas(240, 240);
      let ctx = canvas.getContext('2d');

      const size = 240;
      const frameCount = 120;

      const panel = createRoulettePanel(
        candidates,
        size,
        frameCount
      );

      let currentFrameNumber = 0;
      function outputFrameImageFile(canvas) {
        const _canvas = new Canvas(240, 240);
        currentFrameNumber++;
        _canvas.getContext('2d').putImageData(ctx.getImageData(0, 0, 240, 240), 0, 0);
        return fs.writeFileSync(`${path.resolve('./tmp', fileName)}.${currentFrameNumber}.png`, _canvas.toBuffer());
      }
      function removeFrameImageFile() {
        while (currentFrameNumber > 0) {
          fs.unlinkSync(`${path.resolve('./tmp', fileName)}.${currentFrameNumber}.png`);
          currentFrameNumber--;
        }
      }

      // Add animation
      function render(ctx, canvas, size, pos, deg) {
        ctx.save();
        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(0, 0, size, size);
        const easingName = 'easeOutQuint';
        const rad = deg * easing[easingName](pos) * Math.PI / 180;
        ctx.setTransform(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), 120, 120);
        ctx.drawImage(canvas, size * -0.5, size * -0.5);
        ctx.restore();
        ctx.save();
        ctx.lineWidth = 2;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cccccc';
        ctx.beginPath();
        ctx.lineTo(size, size * 0.5 - 10);
        ctx.lineTo(size - size * 0.125, size * 0.5);
        ctx.lineTo(size, size * 0.5 + 10);
        ctx.stroke();
        ctx.fill();
        outputFrameImageFile(canvas);
        ctx.restore();
      }

      [...Array(frameCount)].forEach((_, i) => {
        render(ctx, panel.canvas, 240, (i + 1) / frameCount, panel.deg);
      });

      // Add result text
      ctx.font = '36px sans-serif';
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.strokeText(panel.candidate, size * 0.5, size * 0.5);
      ctx.fillText(panel.candidate, size * 0.5, size * 0.5);
      for (let i = 0; i < 60; i++) {
        outputFrameImageFile(canvas);
      }

      ffmpeg(`${path.resolve('./tmp', fileName)}.%d.png`)
        .inputFPS(30)
        .format('mp4')
        .size('240x240')
        .addOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p'
        ])
        .screenshots({
          timemarks: ['10%'],
          filename: `${fileName}.png`,
          folder: path.resolve('./public'),
          size: '?x700'
        })
        .on('error', (err) => {
          console.error('error', err.message);
        })
        .on('end', () => {
          resolve(fileName);
        })
        .save(`${path.resolve('./public', fileName)}`);
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = createVideo;