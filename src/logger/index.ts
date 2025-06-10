import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import winston from 'winston';

// ログレベル
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ログディレクトリの作成
const logDir = path.join(os.homedir(), '.projectctl', 'logs');
fs.mkdir(logDir, { recursive: true }).catch(console.error);

// ログフォーマット
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// コンソール用フォーマット
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// ロガーの作成
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // コンソール出力
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // ファイル出力（エラー）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // ファイル出力（全ログ）
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// 開発環境の場合はデバッグログも出力
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.File({
      filename: path.join(logDir, 'debug.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// ロガーの設定を更新する関数
export function configureLogger(options: {
  level?: LogLevel;
  file?: string;
  console?: boolean;
}): void {
  if (options.level) {
    logger.level = options.level;
  }

  if (options.file) {
    logger.add(
      new winston.transports.File({
        filename: options.file,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  if (options.console === false) {
    logger.remove(winston.transports.Console);
  }
}

// ロガーのインスタンスをエクスポート
export default logger; 