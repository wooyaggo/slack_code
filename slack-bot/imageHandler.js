import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Slack file 객체 배열에서 이미지를 /tmp에 다운로드
 * @param {Array} files - Slack 메시지의 files 배열
 * @param {string} botToken - Slack Bot Token (인증용)
 * @returns {Promise<string[]>} 다운로드된 임시 파일 경로 목록
 */
export async function downloadImages(files, botToken) {
  if (!files || files.length === 0) return [];

  const imageMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  const imageFiles = files.filter(f => imageMimeTypes.includes(f.mimetype));

  const paths = [];

  for (const file of imageFiles) {
    const url = file.url_private_download || file.url_private;
    const ext = file.name?.split('.').pop() || 'png';
    const tmpPath = path.join(os.tmpdir(), `slack_img_${file.id}.${ext}`);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${botToken}` },
      maxRedirects: 5,
    });

    // 다운로드 결과가 HTML이면 실패 (Slack 인증 리다이렉트)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.error(`[이미지 다운로드 실패] HTML 응답 수신 (인증 오류?): ${url}`);
      continue;
    }

    fs.writeFileSync(tmpPath, response.data);

    paths.push(tmpPath);
  }

  return paths;
}

/**
 * 임시 이미지 파일 삭제
 * @param {string[]} filePaths
 */
export function cleanupImages(filePaths) {
  for (const p of filePaths) {
    try {
      fs.unlinkSync(p);
    } catch {
      // 이미 없으면 무시
    }
  }
}
